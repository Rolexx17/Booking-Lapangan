import db, { query } from '../config/db.js';
import BaseController from '../utils/BaseController.js';

const ALLOWED_STATUS = ['Pending', 'Success', 'Cancelled'];
const SLOT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

/*
  Helper untuk mapping status booking -> status pembayaran yang akan disimpan / ditampilkan.
  - Success -> Verified (tanda pembayaran diterima)
  - Cancelled -> Unpaid
  - Lainnya -> WaitingVerification
*/
const toPaymentStatusByBookingStatus = (status) => {
  if (status === 'Success') return 'Verified';
  if (status === 'Cancelled') return 'Unpaid';
  return 'WaitingVerification';
};

/*
  Fungsi untuk mengirim event realtime via Socket.IO ke room-role, room-user, dan room-field per tanggal.
  Event digunakan oleh frontend untuk menerima notifikasi/perubahan booking secara real-time.
*/
function emitBookingRealtime(io, payload) {
  if (!io) return;
  io.to('role:admin').emit('booking:changed', payload);
  io.to('role:kasir').emit('booking:changed', payload);

  if (payload.user_id) io.to(`user:${payload.user_id}`).emit('booking:changed', payload);
  if (payload.field_id && payload.booking_date) {
    io.to(`field:${payload.field_id}:date:${payload.booking_date}`).emit('slot:changed', {
      field_id: payload.field_id,
      booking_date: payload.booking_date
    });
  }

  if (payload.user_id && payload.notification) {
    io.to(`user:${payload.user_id}`).emit('notification:new', payload.notification);
  }
}

/*
  Controller untuk operasi terkait booking:
  - createBooking: membuat booking (support multiple slots), validasi harga, transaksi DB, lock record field untuk konsistensi.
  - getAllBookings: list semua booking (filter, pagination) untuk admin/kasir.
  - getMyBookings: riwayat booking user yang sedang login.
  - getMyNotifications: notifikasi status booking untuk user.
  - updateBookingStatus: update status booking (proteksi akses berdasarkan role).
  - verifyPayment: admin/kasir mengubah payment_status menjadi Verified/Rejected.
  - uploadPaymentProof: mengunggah file bukti pembayaran (menggunakan middleware multer).
  - deleteBooking: menghapus booking dengan aturan role.
  - getBookedSlots: mengambil daftar slot yang sudah terisi untuk field+date.
*/
class BookingController extends BaseController {
  constructor() {
    super('Booking');
  }

  /*
    Membuat booking:
    - Dukungan slot tunggal atau array slot.
    - Validasi format slot dan tanggal.
    - Mengunci baris lapangan (FOR UPDATE) agar harga tidak berubah selama transaksi.
    - Menghitung diskon berdasarkan jumlah slot (kelipatan 5% per extra slot sampai max 20%).
    - Mengecek bentrok slot untuk tanggal dan lapangan yang sama.
    - Membagi rata total_price ke setiap baris booking agar laporan konsisten.
    - Commit transaksi dan emit event realtime.
  */
  createBooking = async (req, res) => {
    const client = await db.connect();
    try {
      const { field_id, booking_date, time_slot, total_price, payment_proof } = req.body;

      if (!field_id || !booking_date || !time_slot || !total_price) {
        return this.sendError(res, 400, 'Data booking (field_id, booking_date, time_slot, total_price) harus diisi lengkap');
      }

      // Pastikan time_slot diproses sebagai Array (Mendukung single & multi-slot)
      const slots = Array.isArray(time_slot) ? time_slot : [time_slot];
      if (slots.length < 1) return this.sendError(res, 400, 'Minimal pilih 1 slot waktu');
      
      if (slots.some((s) => !SLOT_REGEX.test(String(s)))) {
        return this.sendError(res, 400, 'Format time_slot tidak valid. Gunakan format HH:MM-HH:MM');
      }

      // Validasi Tanggal
      const inputDate = new Date(booking_date);
      if (Number.isNaN(inputDate.getTime())) return this.sendError(res, 400, 'booking_date tidak valid');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selected = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
      if (selected < today) return this.sendError(res, 400, 'booking_date tidak boleh tanggal yang sudah lewat');

      const parsedPrice = Number(total_price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return this.sendError(res, 400, 'total_price tidak valid');

      const user_id = req.user.id;

      await client.query('BEGIN');

      // Lock row lapangan untuk menghindari perubahan harga mendadak saat transaksi berjalan
      const fieldRes = await client.query('SELECT id, price FROM fields WHERE id = $1 LIMIT 1 FOR UPDATE', [field_id]);
      if (fieldRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return this.sendError(res, 404, 'Lapangan tidak ditemukan');
      }

      const unitPrice = Number(fieldRes.rows[0].price);
      const slotCount = slots.length;
      
      // Hitung ekspektasi harga pasca-diskon
      const discountPercent = Math.min(Math.max(slotCount - 1, 0) * 5, 20);
      const expectedTotal = unitPrice * slotCount * (1 - discountPercent / 100);

      if (Math.round(parsedPrice) !== Math.round(expectedTotal)) {
        await client.query('ROLLBACK');
        return this.sendError(res, 400, 'total_price tidak sesuai dengan perhitungan harga dan diskon terbaru');
      }

      // Cek bentrok jadwal untuk seluruh slot yang dipilih menggunakan operator ANY
      const existing = await client.query(
        `SELECT time_slot FROM bookings
         WHERE field_id = $1 AND booking_date = $2 AND status != 'Cancelled' AND time_slot = ANY($3::text[])
         FOR UPDATE`,
        [field_id, booking_date, slots]
      );
      
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return this.sendError(res, 409, `Slot berikut sudah terisi: ${existing.rows.map((x) => x.time_slot).join(', ')}`);
      }

      const paymentStatus = payment_proof ? 'WaitingVerification' : 'Unpaid';
      
      // Bagi rata total_price yang sudah didiskon ke masing-masing baris database agar laporan keuangan sinkron
      const pricePerSlot = parsedPrice / slotCount;
      const createdIds = [];

      for (const slot of slots) {
        const ins = await client.query(
          `INSERT INTO bookings
             (user_id, field_id, booking_date, time_slot, total_price, payment_proof, status, payment_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
           RETURNING id`,
          [user_id, field_id, booking_date, slot, pricePerSlot, payment_proof || null, paymentStatus]
        );
        createdIds.push(ins.rows[0].id);
      }

      await client.query('COMMIT');

      emitBookingRealtime(req.io, {
        action: 'created',
        booking_ids: createdIds,
        user_id: Number(user_id),
        field_id: Number(field_id),
        booking_date,
        status: 'Pending',
        payment_status: paymentStatus
      });

      this.sendSuccess(res, 201, 'Booking berhasil dibuat', {
        booking_ids: createdIds,
        slot_count: slotCount,
        discount_percent: discountPercent,
        total_price: parsedPrice
      });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      this.sendError(res, 500, 'Gagal membuat booking', error.message);
    } finally {
      client.release();
    }
  };

  /*
    Mengambil semua booking:
    - Filter by status, payment_status, user_id (opsional).
    - Paginasi dan join ke users/fields untuk informasi terkait.
  */
  getAllBookings = async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const status = req.query.status ? String(req.query.status).trim() : '';
      const paymentStatus = req.query.payment_status ? String(req.query.payment_status).trim() : '';
      const userId = req.query.user_id ? Number(req.query.user_id) : null;
      const offset = (page - 1) * limit;

      let idx = 1;
      const where = [];
      const params = [];

      if (status) { where.push(`b.status = $${idx}`); params.push(status); idx++; }
      if (paymentStatus) { where.push(`b.payment_status = $${idx}`); params.push(paymentStatus); idx++; }
      if (userId) { where.push(`b.user_id = $${idx}`); params.push(userId); idx++; }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const dataSql = `
        SELECT b.*, u.name as user_name, f.name as field_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN fields f ON b.field_id = f.id
        ${whereClause}
        ORDER BY b.id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const countSql = `SELECT COUNT(*)::int as total FROM bookings b ${whereClause}`;

      const dataRes = await query(dataSql, [...params, limit, offset]);
      const countRes = await query(countSql, params);

      this.sendSuccess(res, 200, 'Berhasil mengambil semua data booking', dataRes.rows, {
        page,
        limit,
        totalItems: countRes.rows[0].total,
        totalPages: Math.ceil(countRes.rows[0].total / limit)
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil data booking', error.message);
    }
  };

  // Mengambil semua booking untuk user yang sedang login dan menambahkan field payment_display untuk UI.
  getMyBookings = async (req, res) => {
    try {
      const r = await query(
        `SELECT b.*, f.name as field_name, f.type as field_type
         FROM bookings b
         JOIN fields f ON b.field_id = f.id
         WHERE b.user_id = $1
         ORDER BY b.id DESC`,
        [req.user.id]
      );

      const mapped = r.rows.map((x) => ({
        ...x,
        payment_display:
          x.status === 'Success' ? 'Paid' :
          x.status === 'Cancelled' ? 'Unpaid' : 'WaitingVerification'
      }));

      this.sendSuccess(res, 200, 'Riwayat booking saya', mapped);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil histori', error.message);
    }
  };

  /*
    Mengambil notifikasi untuk user:
    - Mengambil booking yang telah Success atau Cancelled.
    - Memformat menjadi objek notifikasi yang dapat ditampilkan di frontend.
  */
  getMyNotifications = async (req, res) => {
    try {
      // Jika tabel bookings belum punya kolom created_at, hapus 'b.created_at,' dari query SQL di bawah ini agar tidak error.
      const r = await query(
        `SELECT b.id, b.field_id, b.booking_date, b.time_slot, b.total_price, b.status, b.payment_status, b.created_at,
                f.name as field_name
         FROM bookings b
         JOIN fields f ON b.field_id = f.id
         WHERE b.user_id = $1 AND b.status IN ('Success', 'Cancelled')
         ORDER BY b.id DESC
         LIMIT 50`,
        [req.user.id]
      );

      const rows = r.rows.map((x) => ({
        id: `booking-status-${x.id}`,
        type: 'booking_status',
        unread: true,
        created_at: x.created_at || null, 
        title: `Booking #${x.id} ${x.status === 'Success' ? 'berhasil dikonfirmasi' : 'dibatalkan'}`,
        message: `${x.field_name} • ${x.booking_date} • ${x.time_slot} • Status: ${x.status}`,
        booking: {
          ...x,
          payment_display:
            x.status === 'Success' ? 'Paid' :
            x.status === 'Cancelled' ? 'Unpaid' : 'WaitingVerification'
        }
      }));

      this.sendSuccess(res, 200, 'Notifikasi saya', rows);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil notifikasi', error.message);
    }
  };

  /*
    Update status booking:
    - Validasi status terhadap daftar yang diizinkan.
    - Proteksi akses: customer hanya boleh membatalkan booking miliknya sendiri.
    - Mengupdate payment_status sesuai mapping dan mengirim event + notifikasi realtime.
  */
  updateBookingStatus = async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !ALLOWED_STATUS.includes(status)) return this.sendError(res, 400, 'Status booking tidak valid');

      const b = await query(
        'SELECT id, user_id, field_id, booking_date, status, payment_status FROM bookings WHERE id = $1 LIMIT 1',
        [req.params.id]
      );
      if (b.rows.length === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      const booking = b.rows[0];

      // Proteksi Akses
      if (req.user.role === 'customer') {
        if (status !== 'Cancelled') return this.sendError(res, 403, 'Customer hanya boleh mengubah status menjadi Cancelled');
        if (Number(booking.user_id) !== Number(req.user.id)) return this.sendError(res, 403, 'Tidak bisa mengubah booking milik user lain');
      }

      const newPaymentStatus = toPaymentStatusByBookingStatus(status);

      await query('UPDATE bookings SET status = $1, payment_status = $2 WHERE id = $3', [status, newPaymentStatus, req.params.id]);

      emitBookingRealtime(req.io, {
        action: 'status_updated',
        booking_id: Number(req.params.id),
        user_id: Number(booking.user_id),
        field_id: Number(booking.field_id),
        booking_date: booking.booking_date,
        status,
        payment_status: newPaymentStatus,
        notification: {
          id: `booking-status-${req.params.id}-${Date.now()}`,
          type: 'booking_status',
          unread: true,
          title: `Status booking #${req.params.id} diperbarui`,
          message: `Status terbaru: ${status}`,
          booking_id: Number(req.params.id)
        }
      });

      this.sendSuccess(res, 200, 'Status booking berhasil diupdate', { 
        id: Number(req.params.id), 
        status, 
        payment_status: newPaymentStatus 
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal update status booking', error.message);
    }
  };

  /*
    Verifikasi pembayaran oleh admin/kasir:
    - Validasi payment_status hanya boleh Verified atau Rejected.
    - Pastikan booking memiliki bukti pembayaran sebelum verifikasi.
    - Update payment_status dan kirim event realtime + notifikasi.
  */
  verifyPayment = async (req, res) => {
    try { 
      const { payment_status } = req.body;
      if (!payment_status || !['Verified', 'Rejected'].includes(payment_status)) {
        return this.sendError(res, 400, 'payment_status harus salah satu: Verified atau Rejected');
      }

      const b = await query(
        'SELECT id, user_id, field_id, booking_date, payment_status, payment_proof FROM bookings WHERE id = $1 LIMIT 1',
        [req.params.id]
      );
      if (b.rows.length === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      const booking = b.rows[0];
      if (!booking.payment_proof) return this.sendError(res, 400, 'Booking belum memiliki bukti pembayaran');

      await query('UPDATE bookings SET payment_status = $1 WHERE id = $2', [payment_status, req.params.id]);

      emitBookingRealtime(req.io, {
        action: 'payment_updated',
        booking_id: Number(req.params.id),
        user_id: Number(booking.user_id),
        field_id: Number(booking.field_id),
        booking_date: booking.booking_date,
        payment_status,
        notification: {
          id: `payment-status-${req.params.id}-${Date.now()}`,
          type: 'payment_status',
          unread: true,
          title: `Pembayaran booking #${req.params.id} ${payment_status === 'Verified' ? 'Diterima' : 'Ditolak'}`,
          message: `Status pembayaran Anda sekarang adalah: ${payment_status}`,
          booking_id: Number(req.params.id)
        }
      });

      this.sendSuccess(res, 200, 'Status pembayaran berhasil diperbarui', {
        id: Number(req.params.id),
        payment_status
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal verifikasi pembayaran', error.message);
    }
  };

  /*
    Upload bukti pembayaran:
    - Memeriksa kepemilikan ketika role customer.
    - Menggunakan req.file yang disediakan middleware multer.
    - Menyimpan path file ke kolom payment_proof dan set payment_status = WaitingVerification.
    - Emit event realtime untuk update.
  */
  uploadPaymentProof = async (req, res) => { 
    try {
      const bookingId = Number(req.params.id);
      if (!bookingId) return this.sendError(res, 400, 'ID booking tidak valid');

      const b = await query(
        'SELECT id, user_id, field_id, booking_date FROM bookings WHERE id = $1 LIMIT 1',
        [bookingId]
      );
      if (b.rows.length === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      const booking = b.rows[0];

      if (req.user.role === 'customer' && Number(booking.user_id) !== Number(req.user.id)) {
        return this.sendError(res, 403, 'Tidak bisa upload bukti booking milik user lain');
      }

      if (!req.file) return this.sendError(res, 400, 'File bukti pembayaran wajib diupload');

      const proofPath = `/uploads/payment-proofs/${req.file.filename}`;

      await query(
        `UPDATE bookings
         SET payment_proof = $1, payment_status = 'WaitingVerification'
         WHERE id = $2`,
        [proofPath, bookingId]
      );

      emitBookingRealtime(req.io, {
        action: 'proof_uploaded',
        booking_id: bookingId,
        user_id: Number(booking.user_id),
        field_id: Number(booking.field_id),
        booking_date: booking.booking_date,
        payment_status: 'WaitingVerification'
      });

      this.sendSuccess(res, 200, 'Bukti pembayaran berhasil diupload', {
        id: bookingId,
        payment_proof: proofPath,
        payment_status: 'WaitingVerification'
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal upload bukti pembayaran', error.message);
    }
  };

  /*
    Menghapus booking:
    - Customer hanya boleh menghapus booking miliknya dan tidak boleh menghapus saat status Pending (harus cancel dulu).
    - Setelah delete, emit event realtime agar UI sinkron.
  */
  deleteBooking = async (req, res) => { 
    try {
      const b = await query(
        'SELECT id, user_id, field_id, booking_date, status FROM bookings WHERE id = $1 LIMIT 1',
        [req.params.id]
      );
      if (b.rows.length === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      const booking = b.rows[0];

      if (req.user.role === 'customer') {
        if (Number(booking.user_id) !== Number(req.user.id)) return this.sendError(res, 403, 'Tidak bisa menghapus booking milik user lain');
        if (booking.status === 'Pending') return this.sendError(res, 400, 'Booking pending tidak boleh dihapus, silakan cancel terlebih dahulu');
      }

      const del = await query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
      if (del.rowCount === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      emitBookingRealtime(req.io, {
        action: 'deleted',
        booking_id: Number(req.params.id),
        user_id: Number(booking.user_id),
        field_id: Number(booking.field_id),
        booking_date: booking.booking_date
      });

      this.sendSuccess(res, 200, 'Riwayat booking berhasil dihapus');
    } catch (error) {
      this.sendError(res, 500, 'Gagal menghapus booking', error.message);
    }
  };

  // Mengambil daftar slot yang sudah terisi (status != Cancelled) untuk field dan tanggal tertentu.
  getBookedSlots = async (req, res) => {
    try {
      const fieldId = Number(req.params.fieldId);
      const date = String(req.query.date || '').trim();

      if (!fieldId || Number.isNaN(fieldId)) return this.sendError(res, 400, 'fieldId tidak valid');
      if (!date) return this.sendError(res, 400, 'query date wajib diisi (YYYY-MM-DD)');

      const r = await query(
        `SELECT time_slot
         FROM bookings
         WHERE field_id = $1 AND booking_date = $2 AND status != 'Cancelled'`,
        [fieldId, date]
      );

      this.sendSuccess(res, 200, 'Slot terisi berhasil diambil', r.rows.map((x) => x.time_slot));
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil slot terisi', error.message);
    }
  };
}

export default new BookingController();