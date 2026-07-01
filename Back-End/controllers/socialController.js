import { query } from '../config/db.js';
import BaseController from '../utils/BaseController.js';
import { AppError } from '../utils/AppError.js';

class SocialController extends BaseController {
  constructor() {
    super('Social');
  }

  getMatchmakings = async (req, res, next) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
      const fieldId = req.query.field_id ? Number(req.query.field_id) : null;
      const skillLevel = String(req.query.skill_level || '').trim();
      const offset = (page - 1) * limit;

      let idx = 1;
      const where = [];
      const params = [];

      if (fieldId) { where.push(`m.field_id = $${idx}`); params.push(fieldId); idx++; }
      if (skillLevel) { where.push(`m.skill_level = $${idx}`); params.push(skillLevel); idx++; }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const dataSql = `
        SELECT m.*, u.name as host_name, f.name as field_name
        FROM matchmakings m
        JOIN users u ON m.user_id = u.id
        JOIN fields f ON m.field_id = f.id
        ${whereClause}
        ORDER BY m.id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const countSql = `SELECT COUNT(*)::int as total FROM matchmakings m ${whereClause}`;

      const rows = await query(dataSql, [...params, limit, offset]);
      const totalRows = await query(countSql, params);

      this.sendSuccess(res, 200, 'Data mabar', rows.rows, {
        page,
        limit,
        totalItems: totalRows.rows[0].total,
        totalPages: Math.ceil(totalRows.rows[0].total / limit),
        filters: { field_id: fieldId, skill_level: skillLevel }
      });
    } catch (error) {
      next(error);
    }
  };

  createMatchmaking = async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { field_id, skill_level, looking_for, time_schedule, note } = req.body;

      if (!field_id || !skill_level || !looking_for || !time_schedule) {
        return next(new AppError('Data matchmaking harus diisi lengkap', 400));
      }

      const ins = await query(
        'INSERT INTO matchmakings (user_id, field_id, skill_level, looking_for, time_schedule, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [user_id, field_id, skill_level, looking_for, time_schedule, note || null]
      );

      if (req.io) req.io.emit('matchmaking:changed', { action: 'created', id: ins.rows[0].id });

      this.sendSuccess(res, 201, 'Ajakan mabar diposting', { id: ins.rows[0].id });
    } catch (error) {
      next(error);
    }
  };

  updateMatchmaking = async (req, res, next) => {
    try {
      const { skill_level, looking_for, time_schedule, note } = req.body;

      const found = await query('SELECT user_id FROM matchmakings WHERE id = $1 LIMIT 1', [req.params.id]);
      if (found.rows.length === 0) return next(new AppError('Posting mabar tidak ditemukan', 404));

      const isOwner = Number(found.rows[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Akses ditolak (bukan pemilik posting)', 403));

      await query(
        'UPDATE matchmakings SET skill_level = $1, looking_for = $2, time_schedule = $3, note = $4 WHERE id = $5',
        [skill_level, looking_for, time_schedule, note || null, req.params.id]
      );

      if (req.io) req.io.emit('matchmaking:changed', { action: 'updated', id: Number(req.params.id) });

      this.sendSuccess(res, 200, 'Posting mabar berhasil diupdate', { id: Number(req.params.id) });
    } catch (error) {
      next(error);
    }
  };

  deleteMatchmaking = async (req, res, next) => {
    try {
      const found = await query('SELECT user_id FROM matchmakings WHERE id = $1 LIMIT 1', [req.params.id]);
      if (found.rows.length === 0) return next(new AppError('Posting mabar tidak ditemukan', 404));

      const isOwner = Number(found.rows[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Tidak memiliki akses menghapus posting ini', 403));

      await query('DELETE FROM matchmakings WHERE id = $1', [req.params.id]);

      if (req.io) req.io.emit('matchmaking:changed', { action: 'deleted', id: Number(req.params.id) });

      this.sendSuccess(res, 200, 'Posting mabar berhasil dihapus');
    } catch (error) {
      next(error);
    }
  };

  getMatchmakingMessages = async (req, res, next) => {
    try {
      const matchmakingId = Number(req.params.id);
      if (!matchmakingId) return next(new AppError('ID matchmaking tidak valid', 400));

      const mk = await query('SELECT id FROM matchmakings WHERE id = $1 LIMIT 1', [matchmakingId]);
      if (mk.rows.length === 0) return next(new AppError('Posting mabar tidak ditemukan', 404));

      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
      const offset = (page - 1) * limit;

      const rows = await query(
        `SELECT mm.id, mm.matchmaking_id, mm.sender_id, u.name as sender_name, mm.message, mm.created_at
         FROM matchmaking_messages mm
         JOIN users u ON mm.sender_id = u.id
         WHERE mm.matchmaking_id = $1
         ORDER BY mm.id DESC
         LIMIT $2 OFFSET $3`,
        [matchmakingId, limit, offset]
      );

      const countRows = await query(
        'SELECT COUNT(*)::int as total FROM matchmaking_messages WHERE matchmaking_id = $1',
        [matchmakingId]
      );

      this.sendSuccess(res, 200, 'Chat matchmaking berhasil diambil', rows.rows.reverse(), {
        page,
        limit,
        totalItems: countRows.rows[0].total,
        totalPages: Math.ceil(countRows.rows[0].total / limit)
      });
    } catch (error) {
      next(error);
    }
  };

  sendMatchmakingMessage = async (req, res, next) => {
    try {
      const matchmakingId = Number(req.params.id);
      const senderId = Number(req.user.id);
      const message = String(req.body?.message || '').trim();

      if (!matchmakingId) return next(new AppError('ID matchmaking tidak valid', 400));
      if (!message) return next(new AppError('Pesan tidak boleh kosong', 400));
      if (message.length > 1000) return next(new AppError('Pesan terlalu panjang (maks 1000 karakter)', 400));

      const mk = await query('SELECT id FROM matchmakings WHERE id = $1 LIMIT 1', [matchmakingId]);
      if (mk.rows.length === 0) return next(new AppError('Posting mabar tidak ditemukan', 404));

      const ins = await query(
        'INSERT INTO matchmaking_messages (matchmaking_id, sender_id, message) VALUES ($1, $2, $3) RETURNING id',
        [matchmakingId, senderId, message]
      );

      const msg = await query(
        `SELECT mm.id, mm.matchmaking_id, mm.sender_id, u.name as sender_name, mm.message, mm.created_at
         FROM matchmaking_messages mm
         JOIN users u ON mm.sender_id = u.id
         WHERE mm.id = $1 LIMIT 1`,
        [ins.rows[0].id]
      );

      const newMsg = msg.rows[0];
      if (req.io) req.io.to(`matchmaking:${matchmakingId}`).emit('matchmaking:message:new', newMsg);

      this.sendSuccess(res, 201, 'Pesan berhasil dikirim', newMsg);
    } catch (error) {
      next(error);
    }
  };

  getReviewsByField = async (req, res, next) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
      const offset = (page - 1) * limit;

      const rows = await query(
        `SELECT r.*, u.name as reviewer_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.field_id = $1
         ORDER BY r.id DESC
         LIMIT $2 OFFSET $3`,
        [req.params.fieldId, limit, offset]
      );

      const countRows = await query(
        'SELECT COUNT(*)::int as total FROM reviews WHERE field_id = $1',
        [req.params.fieldId]
      );

      this.sendSuccess(res, 200, 'Ulasan lapangan', rows.rows, {
        page,
        limit,
        totalItems: countRows.rows[0].total,
        totalPages: Math.ceil(countRows.rows[0].total / limit)
      });
    } catch (error) {
      next(error);
    }
  };

  createReview = async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const field_id = Number(req.params.fieldId);
      const { rating, comment } = req.body;

      if (!rating || !comment) return next(new AppError('Data ulasan (rating, comment) harus diisi', 400));

      const fieldRows = await query('SELECT id FROM fields WHERE id = $1', [field_id]);
      if (fieldRows.rows.length === 0) return next(new AppError('Lapangan tidak ditemukan', 404));

      const ins = await query(
        'INSERT INTO reviews (user_id, field_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING id',
        [user_id, field_id, rating, comment]
      );

      await query(
        'UPDATE fields SET rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE field_id = $1) WHERE id = $2',
        [field_id, field_id]
      );

      this.sendSuccess(res, 201, 'Ulasan berhasil ditambahkan', {
        id: ins.rows[0].id,
        field_id,
        rating,
        comment
      });
    } catch (error) {
      next(error);
    }
  };

  updateReview = async (req, res, next) => {
    try {
      const { rating, comment } = req.body;

      const reviewData = await query('SELECT user_id, field_id FROM reviews WHERE id = $1', [req.params.id]);
      if (reviewData.rows.length === 0) return next(new AppError('Ulasan tidak ditemukan', 404));

      const isOwner = Number(reviewData.rows[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Akses ditolak (bukan pemilik ulasan)', 403));

      await query('UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3', [rating, comment, req.params.id]);

      const field_id = reviewData.rows[0].field_id;
      await query(
        'UPDATE fields SET rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE field_id = $1) WHERE id = $2',
        [field_id, field_id]
      );

      this.sendSuccess(res, 200, 'Ulasan berhasil diupdate', { id: Number(req.params.id), rating, comment });
    } catch (error) {
      next(error);
    }
  };

  deleteReview = async (req, res, next) => {
    try {
      const reviewData = await query('SELECT user_id, field_id FROM reviews WHERE id = $1', [req.params.id]);
      if (reviewData.rows.length === 0) return next(new AppError('Ulasan tidak ditemukan', 404));

      const isOwner = Number(reviewData.rows[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Akses ditolak (bukan pemilik ulasan)', 403));

      const field_id = reviewData.rows[0].field_id;
      await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);

      await query(
        'UPDATE fields SET rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE field_id = $1) WHERE id = $2',
        [field_id, field_id]
      );

      this.sendSuccess(res, 200, 'Ulasan berhasil dihapus');
    } catch (error) {
      next(error);
    }
  };
}

export default new SocialController();