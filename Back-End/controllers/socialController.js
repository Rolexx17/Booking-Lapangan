import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class SocialController extends BaseController {
    constructor() { super('Social'); }

    getMatchmakings = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const query = `
                SELECT m.*, u.name as host_name, f.name as field_name 
                FROM matchmakings m
                JOIN users u ON m.user_id = u.id
                JOIN fields f ON m.field_id = f.id
                ORDER BY m.id DESC LIMIT ? OFFSET ?
            `;
            const [rows] = await db.query(query, [limit, offset]);
            this.sendSuccess(res, 200, "Data mabar", rows);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil data", error.message);
        }
    };

    createMatchmaking = async (req, res) => {
        try {
            const { user_id, field_id, skill_level, looking_for, time_schedule, note } = req.body;
            
            if (!user_id || !field_id || !skill_level || !looking_for || !time_schedule) {
                return this.sendError(res, 400, "Data matchmaking (user_id, field_id, skill_level, looking_for, time_schedule) harus diisi");
            }

            const [result] = await db.query(
                'INSERT INTO matchmakings (user_id, field_id, skill_level, looking_for, time_schedule, note) VALUES (?, ?, ?, ?, ?, ?)',
                [user_id, field_id, skill_level, looking_for, time_schedule, note]
            );
            this.sendSuccess(res, 201, "Ajakan mabar diposting", { id: result.insertId });
        } catch (error) {
            this.sendError(res, 500, "Gagal memposting", error.message);
        }
    };

    updateMatchmaking = async (req, res) => {
        try {
            const { skill_level, looking_for, time_schedule, note } = req.body;
            
            if (!skill_level || !looking_for || !time_schedule) {
                return this.sendError(res, 400, "Data update matchmaking (skill_level, looking_for, time_schedule) harus diisi");
            }

            const [result] = await db.query(
                'UPDATE matchmakings SET skill_level = ?, looking_for = ?, time_schedule = ?, note = ? WHERE id = ?',
                [skill_level, looking_for, time_schedule, note, req.params.id]
            );
            
            if (result.affectedRows === 0) return this.sendError(res, 404, "Posting mabar tidak ditemukan");
            this.sendSuccess(res, 200, "Posting mabar berhasil diupdate", { id: req.params.id });
        } catch (error) {
            this.sendError(res, 500, "Gagal update mabar", error.message);
        }
    };

    deleteMatchmaking = async (req, res) => {
        try {
            const [result] = await db.query('DELETE FROM matchmakings WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) return this.sendError(res, 404, "Posting mabar tidak ditemukan");
            
            this.sendSuccess(res, 200, "Posting mabar berhasil dihapus");
        } catch (error) {
            this.sendError(res, 500, "Gagal menghapus mabar", error.message);
        }
    };

    getReviewsByField = async (req, res) => {
        try {
            const [rows] = await db.query(
                `SELECT r.*, u.name as reviewer_name FROM reviews r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.field_id = ? ORDER BY r.id DESC`, 
                [req.params.fieldId]
            );
            this.sendSuccess(res, 200, "Ulasan lapangan", rows);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil ulasan", error.message);
        }
    };

    createReview = async (req, res) => {
        try {
            const { user_id, rating, comment } = req.body;
            const field_id = req.params.fieldId;
            
            if (!user_id || !rating || !comment) {
                return this.sendError(res, 400, "Data ulasan (user_id, rating, comment) harus diisi");
            }

            const [result] = await db.query(
                'INSERT INTO reviews (user_id, field_id, rating, comment) VALUES (?, ?, ?, ?)',
                [user_id, field_id, rating, comment]
            );

            await db.query(
                'UPDATE fields SET rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE field_id = ?) WHERE id = ?',
                [field_id, field_id]
            );

            this.sendSuccess(res, 201, "Ulasan berhasil ditambahkan", { id: result.insertId, field_id, rating, comment });
        } catch (error) {
            this.sendError(res, 500, "Gagal menambahkan ulasan", error.message);
        }
    };

    updateReview = async (req, res) => {
        try {
            const { rating, comment } = req.body;
            
            if (!rating || !comment) {
                return this.sendError(res, 400, "Data ulasan (rating, comment) harus diisi");
            }
            
            const [reviewData] = await db.query('SELECT field_id FROM reviews WHERE id = ?', [req.params.id]);
            if (reviewData.length === 0) return this.sendError(res, 404, "Ulasan tidak ditemukan");

            await db.query('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?', [rating, comment, req.params.id]);

            const field_id = reviewData[0].field_id;
            await db.query(
                'UPDATE fields SET rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE field_id = ?) WHERE id = ?',
                [field_id, field_id]
            );

            this.sendSuccess(res, 200, "Ulasan berhasil diupdate", { id: req.params.id, rating, comment });
        } catch (error) {
            this.sendError(res, 500, "Gagal mengupdate ulasan", error.message);
        }
    };

    deleteReview = async (req, res) => {
        try {
            const [reviewData] = await db.query('SELECT field_id FROM reviews WHERE id = ?', [req.params.id]);
            if (reviewData.length === 0) return this.sendError(res, 404, "Ulasan tidak ditemukan");
            
            const field_id = reviewData[0].field_id;

            await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
            
            // Kalkulasi ulang setelah dihapus
            await db.query(
                'UPDATE fields SET rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE field_id = ?) WHERE id = ?',
                [field_id, field_id]
            );
            
            this.sendSuccess(res, 200, "Ulasan berhasil dihapus");
        } catch (error) {
            this.sendError(res, 500, "Gagal menghapus ulasan", error.message);
        }
    };
}

export default new SocialController();