// Controller untuk Manajemen Pemesanan (Booking)

import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

const ALLOWED_STATUS = ['Pending', 'Success', 'Cancelled'];

class BookingController extends BaseController {
  constructor() {
    super('Booking');
  }

  createBooking = async (req, res) => {
    try {
      const { field_id, booking_date, time_slot, total_price, payment_proof } = req.body;

      if (!field_id || !booking_date || !time_slot || !total_price) {
        return this.sendError(
          res,
          400,
          'Data booking (field_id, booking_date, time_slot, total_price) harus diisi lengkap'
        );
      }

      // user_id dari token login (ownership aman)
      const user_id = req.user.id;

      const [existing] = await db.query(
        `SELECT id FROM bookings
         WHERE field_id = ? AND booking_date = ? AND time_slot = ? AND status != 'Cancelled'
         LIMIT 1`,
        [field_id, booking_date, time_slot]
      );

      if (existing.length > 0) return this.sendError(res, 409, 'Jadwal jam tersebut sudah terisi');

      const [result] = await db.query(
        'INSERT INTO bookings (user_id, field_id, booking_date, time_slot, total_price, payment_proof, status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
        [user_id, field_id, booking_date, time_slot, total_price, payment_proof || null]
      );

      this.sendSuccess(res, 201, 'Booking berhasil dibuat', { id: result.insertId, status: 'Pending' });
    } catch (error) {
      this.sendError(res, 500, 'Gagal membuat booking', error.message);
    }
  };

  getAllBookings = async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const status = req.query.status ? String(req.query.status).trim() : '';
      const userId = req.query.user_id ? Number(req.query.user_id) : null;
      const offset = (page - 1) * limit;

      let query = `
        SELECT b.*, u.name as user_name, f.name as field_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN fields f ON b.field_id = f.id
      `;
      let countQuery = `SELECT COUNT(*) as total FROM bookings b`;

      const where = [];
      const params = [];
      const countParams = [];

      if (status) {
        where.push('b.status = ?');
        params.push(status);
        countParams.push(status);
      }

      if (userId) {
        where.push('b.user_id = ?');
        params.push(userId);
        countParams.push(userId);
      }

      if (where.length > 0) {
        query += ` WHERE ${where.join(' AND ')}`;
        countQuery += ` WHERE ${where.join(' AND ')}`;
      }

      query += ' ORDER BY b.id DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      const [totalRows] = await db.query(countQuery, countParams);

      this.sendSuccess(res, 200, 'Berhasil mengambil semua data booking', rows, {
        page,
        limit,
        totalItems: totalRows[0].total,
        totalPages: Math.ceil(totalRows[0].total / limit)
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil data booking', error.message);
    }
  };

  getMyBookings = async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT b.*, f.name as field_name
         FROM bookings b
         JOIN fields f ON b.field_id = f.id
         WHERE b.user_id = ?
         ORDER BY b.id DESC`,
        [req.user.id]
      );
      this.sendSuccess(res, 200, 'Riwayat booking saya', rows);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil histori', error.message);
    }
  };

  updateBookingStatus = async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !ALLOWED_STATUS.includes(status)) {
        return this.sendError(res, 400, 'Status booking tidak valid');
      }

      // Jika customer: hanya boleh cancel booking miliknya sendiri
      if (req.user.role === 'customer') {
        if (status !== 'Cancelled') {
          return this.sendError(res, 403, 'Customer hanya boleh mengubah status menjadi Cancelled');
        }

        const [owned] = await db.query('SELECT id FROM bookings WHERE id = ? AND user_id = ? LIMIT 1', [
          req.params.id,
          req.user.id
        ]);
        if (owned.length === 0) {
          return this.sendError(res, 403, 'Tidak bisa mengubah booking milik user lain');
        }
      }

      const [result] = await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
      if (result.affectedRows === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      this.sendSuccess(res, 200, 'Status booking berhasil diupdate', { id: Number(req.params.id), status });
    } catch (error) {
      this.sendError(res, 500, 'Gagal update status booking', error.message);
    }
  };

  deleteBooking = async (req, res) => {
    try {
      // customer hanya boleh hapus riwayat milik sendiri dengan status non-pending
      if (req.user.role === 'customer') {
        const [rows] = await db.query('SELECT user_id, status FROM bookings WHERE id = ? LIMIT 1', [req.params.id]);
        if (rows.length === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

        const b = rows[0];
        if (Number(b.user_id) !== Number(req.user.id)) {
          return this.sendError(res, 403, 'Tidak bisa menghapus booking milik user lain');
        }
        if (b.status === 'Pending') {
          return this.sendError(res, 400, 'Booking pending tidak boleh dihapus, silakan cancel terlebih dahulu');
        }
      }

      const [result] = await db.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) return this.sendError(res, 404, 'Booking tidak ditemukan');

      this.sendSuccess(res, 200, 'Riwayat booking berhasil dihapus');
    } catch (error) {
      this.sendError(res, 500, 'Gagal menghapus booking', error.message);
    }
  };
}

export default new BookingController();