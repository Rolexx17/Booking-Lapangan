import db, { query } from '../config/db.js';
import BaseController from '../utils/BaseController.js';

const ALLOWED_STATUS = ['Pending', 'Success', 'Cancelled'];
const ALLOWED_PAYMENT_STATUS = ['Unpaid', 'WaitingVerification', 'Verified', 'Rejected'];
const SLOT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

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
}

class BookingController extends BaseController {
  constructor() {
    super('Booking');
  }

  createBooking = async (req, res) => {
    const client = await db.connect();
    try {
      const { field_id, booking_date, time_slot, total_price, payment_proof } = req.body;

      if (!field_id || !booking_date || !time_slot || !total_price) {
        return this.sendError(res, 400, 'Data booking (field_id, booking_date, time_slot, total_price) harus diisi lengkap');
      }

      if (!SLOT_REGEX.test(String(time_slot))) {
        return this.sendError(res, 400, 'Format time_slot tidak valid. Gunakan format HH:MM-HH:MM');
      }

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

      const fieldRes = await client.query('SELECT id, price FROM fields WHERE id = $1 LIMIT 1 FOR UPDATE', [field_id]);
      if (fieldRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return this.sendError(res, 404, 'Lapangan tidak ditemukan');
      }

      const fieldPrice = Number(fieldRes.rows[0].price);
      if (fieldPrice !== parsedPrice) {
        await client.query('ROLLBACK');
        return this.sendError(res, 400, 'total_price tidak sesuai dengan harga lapangan terbaru');
      }

      const existing = await client.query(
        `SELECT id FROM bookings
         WHERE field_id = $1 AND booking_date = $2 AND time_slot = $3 AND status != 'Cancelled'
         LIMIT 1 FOR UPDATE`,
        [field_id, booking_date, time_slot]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return this.sendError(res, 409, 'Jadwal jam tersebut sudah terisi');
      }

      const paymentStatus = payment_proof ? 'WaitingVerification' : 'Unpaid';

      const ins = await client.query(
        `INSERT INTO bookings
          (user_id, field_id, booking_date, time_slot, total_price, payment_proof, status, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
         RETURNING id`,
        [user_id, field_id, booking_date, time_slot, parsedPrice, payment_proof || null, paymentStatus]
      );

      await client.query('COMMIT');

      emitBookingRealtime(req.io, {
        action: 'created',
        booking_id: ins.rows[0].id,
        user_id: Number(user_id),
        field_id: Number(field_id),
        booking_date,
        status: 'Pending',
        payment_status: paymentStatus
      });

      this.sendSuccess(res, 201, 'Booking berhasil dibuat', {
        id: ins.rows[0].id,
        status: 'Pending',
        payment_status: paymentStatus
      });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      this.sendError(res, 500, 'Gagal membuat booking', error.message);
    } finally {
      client.release();
    }
  };

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

  getMyBookings = async (req, res) => {
    try {
      const r = await query(
        `SELECT b.*, f.name as field_name
         FROM bookings b
         JOIN fields f ON b.field_id = f.id
         WHERE b.user_id = $1
         ORDER BY b.id DESC`,
        [req.user.id]
      );
      this.sendSuccess(res, 200, 'Riwayat booking saya', r.rows);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil histori', error.message);
    }
  };

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

      if (req.user.role === 'customer') {
        if (status !== 'Cancelled') return this.sendError(res, 403, 'Customer hanya boleh mengubah status menjadi Cancelled');
        if (Number(booking.user_id) !== Number(req.user.id)) return this.sendError(res, 403, 'Tidak bisa mengubah booking milik user lain');
      }

      const up = await query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
      if (up.rowCount === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      emitBookingRealtime(req.io, {
        action: 'status_updated',
        booking_id: Number(req.params.id),
        user_id: Number(booking.user_id),
        field_id: Number(booking.field_id),
        booking_date: booking.booking_date,
        status
      });

      this.sendSuccess(res, 200, 'Status booking berhasil diupdate', { id: Number(req.params.id), status });
    } catch (error) {
      this.sendError(res, 500, 'Gagal update status booking', error.message);
    }
  };

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
      if (!ALLOWED_PAYMENT_STATUS.includes(booking.payment_status)) return this.sendError(res, 400, 'Status pembayaran saat ini tidak valid');

      await query('UPDATE bookings SET payment_status = $1 WHERE id = $2', [payment_status, req.params.id]);

      emitBookingRealtime(req.io, {
        action: 'payment_updated',
        booking_id: Number(req.params.id),
        user_id: Number(booking.user_id),
        field_id: Number(booking.field_id),
        booking_date: booking.booking_date,
        payment_status
      });

      this.sendSuccess(res, 200, 'Status pembayaran berhasil diperbarui', {
        id: Number(req.params.id),
        payment_status
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal verifikasi pembayaran', error.message);
    }
  };

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