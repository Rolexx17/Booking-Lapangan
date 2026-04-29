import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class BookingController extends BaseController {
    constructor() { super('Booking'); }

    createBooking = async (req, res) => {
        try {
            const { user_id, field_id, booking_date, time_slot, total_price } = req.body;
            
            if (!user_id || !field_id || !booking_date || !time_slot || !total_price) {
                return this.sendError(res, 400, "Data booking (user_id, field_id, booking_date, time_slot, total_price) harus diisi lengkap");
            }

            const [existing] = await db.query(
                `SELECT * FROM bookings WHERE field_id = ? AND booking_date = ? AND time_slot = ? AND status != 'Cancelled'`,
                [field_id, booking_date, time_slot]
            );

            if (existing.length > 0) return this.sendError(res, 400, "Jadwal jam tersebut sudah terisi");

            const [result] = await db.query(
                'INSERT INTO bookings (user_id, field_id, booking_date, time_slot, total_price, status) VALUES (?, ?, ?, ?, ?, "Pending")',
                [user_id, field_id, booking_date, time_slot, total_price]
            );
            
            this.sendSuccess(res, 201, "Booking berhasil dibuat", { id: result.insertId, status: "Pending" });
        } catch (error) {
            this.sendError(res, 500, "Gagal membuat booking", error.message);
        }
    };

    getAllBookings = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status || '';
            const offset = (page - 1) * limit;

            let query = `SELECT b.*, u.name as user_name, f.name as field_name FROM bookings b JOIN users u ON b.user_id = u.id JOIN fields f ON b.field_id = f.id`;
            let countQuery = `SELECT COUNT(*) as total FROM bookings b`;
            const queryParams = [];

            if (status) {
                query += ` WHERE b.status = ?`;
                countQuery += ` WHERE b.status = ?`;
                queryParams.push(status);
            }

            query += ` ORDER BY b.id DESC LIMIT ? OFFSET ?`;
            queryParams.push(limit, offset);

            const [rows] = await db.query(query, queryParams);
            const [totalRows] = await db.query(countQuery, status ? [status] : []);

            this.sendSuccess(res, 200, "Berhasil mengambil semua data booking", rows, {
                page, limit, totalItems: totalRows[0].total, totalPages: Math.ceil(totalRows[0].total / limit)
            });
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil data booking", error.message);
        }
    };

    getUserBookings = async (req, res) => {
        try {
            const [rows] = await db.query(
                `SELECT b.*, f.name as field_name FROM bookings b 
                 JOIN fields f ON b.field_id = f.id WHERE b.user_id = ? ORDER BY b.id DESC`, 
                [req.params.userId]
            );
            this.sendSuccess(res, 200, "Riwayat booking", rows);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil histori", error.message);
        }
    };

    updateBookingStatus = async (req, res) => {
        try {
            const { status } = req.body;
            
            if (!status) {
                return this.sendError(res, 400, "Status booking harus diisi");
            }

            const [result] = await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
            
            if (result.affectedRows === 0) return this.sendError(res, 404, "Booking tidak ditemukan");
            this.sendSuccess(res, 200, "Status booking berhasil diupdate", { id: req.params.id, status });
        } catch (error) {
            this.sendError(res, 500, "Gagal update status booking", error.message);
        }
    };

    deleteBooking = async (req, res) => {
        try {
            const [result] = await db.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
            
            if (result.affectedRows === 0) return this.sendError(res, 404, "Booking tidak ditemukan");
            this.sendSuccess(res, 200, "Riwayat booking berhasil dihapus");
        } catch (error) {
            this.sendError(res, 500, "Gagal menghapus booking", error.message);
        }
    };
}

export default new BookingController();