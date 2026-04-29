import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class SocialController extends BaseController {
    constructor() { super('Social'); }

    // Matchmaking
    getMatchmakings = async (req, res) => {
        try {
            const query = `
                SELECT m.*, u.name as host_name, f.name as field_name 
                FROM matchmakings m
                JOIN users u ON m.user_id = u.id
                JOIN fields f ON m.field_id = f.id
                ORDER BY m.id DESC
            `;
            const [rows] = await db.query(query);
            this.sendSuccess(res, 200, "Data mabar", rows);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil data", error.message);
        }
    };

    createMatchmaking = async (req, res) => {
        try {
            const { user_id, field_id, skill_level, looking_for, time_schedule, note } = req.body;
            const [result] = await db.query(
                'INSERT INTO matchmakings (user_id, field_id, skill_level, looking_for, time_schedule, note) VALUES (?, ?, ?, ?, ?, ?)',
                [user_id, field_id, skill_level, looking_for, time_schedule, note]
            );
            this.sendSuccess(res, 201, "Ajakan mabar diposting", { id: result.insertId });
        } catch (error) {
            this.sendError(res, 500, "Gagal memposting", error.message);
        }
    };

    // Reviews
    getReviewsByField = async (req, res) => {
        try {
            const [rows] = await db.query(
                `SELECT r.*, u.name as reviewer_name FROM reviews r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.field_id = ?`, 
                [req.params.fieldId]
            );
            this.sendSuccess(res, 200, "Ulasan lapangan", rows);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil ulasan", error.message);
        }
    };
}

export default new SocialController();