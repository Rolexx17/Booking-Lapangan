// Controller untuk Fitur Sosial, Matchmaking, dan Ulasan
// Versi UAS Terintegrasi: ownership, pagination/filter, auth-aware operations & robust validations

import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';
import { AppError } from '../utils/AppError.js';

class SocialController extends BaseController {
  constructor() {
    super('Social');
  }

  // Ambil daftar matchmaking dengan pagination + filter
  getMatchmakings = async (req, res, next) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const fieldId = req.query.field_id ? Number(req.query.field_id) : null;
      const skillLevel = req.query.skill_level || '';
      const offset = (page - 1) * limit;

      let query = `
        SELECT m.*, u.name as host_name, f.name as field_name
        FROM matchmakings m
        JOIN users u ON m.user_id = u.id
        JOIN fields f ON m.field_id = f.id
      `;
      let countQuery = `SELECT COUNT(*) as total FROM matchmakings m`;

      const where = [];
      const params = [];
      const countParams = [];

      if (fieldId) {
        where.push('m.field_id = ?');
        params.push(fieldId);
        countParams.push(fieldId);
      }

      if (skillLevel) {
        where.push('m.skill_level = ?');
        params.push(skillLevel);
        countParams.push(skillLevel);
      }

      if (where.length > 0) {
        query += ` WHERE ${where.join(' AND ')}`;
        countQuery += ` WHERE ${where.join(' AND ')}`;
      }

      query += ` ORDER BY m.id DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await db.query(query, params);
      const [totalRows] = await db.query(countQuery, countParams);

      this.sendSuccess(res, 200, 'Data mabar', rows, {
        page,
        limit,
        totalItems: totalRows[0].total,
        totalPages: Math.ceil(totalRows[0].total / limit),
        filters: { field_id: fieldId, skill_level: skillLevel }
      });
    } catch (error) {
      next(error);
    }
  };

  // Buat post matchmaking (user login)
  createMatchmaking = async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { field_id, skill_level, looking_for, time_schedule, note } = req.body;

      // Validasi input wajib dari kode kedua
      if (!field_id || !skill_level || !looking_for || !time_schedule) {
        return next(new AppError('Data matchmaking harus diisi lengkap', 400));
      }

      const [result] = await db.query(
        'INSERT INTO matchmakings (user_id, field_id, skill_level, looking_for, time_schedule, note) VALUES (?, ?, ?, ?, ?, ?)',
        [user_id, field_id, skill_level, looking_for, time_schedule, note || null]
      );

      this.sendSuccess(res, 201, 'Ajakan mabar diposting', { id: result.insertId });
    } catch (error) {
      next(error);
    }
  };

  // Update matchmaking: hanya owner atau admin
  updateMatchmaking = async (req, res, next) => {
    try {
      const { skill_level, looking_for, time_schedule, note } = req.body;

      const [found] = await db.query('SELECT user_id FROM matchmakings WHERE id = ?', [req.params.id]);
      if (found.length === 0) return next(new AppError('Posting mabar tidak ditemukan', 404));

      const isOwner = Number(found[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Akses ditolak (bukan pemilik posting)', 403));

      await db.query(
        'UPDATE matchmakings SET skill_level = ?, looking_for = ?, time_schedule = ?, note = ? WHERE id = ?',
        [skill_level, looking_for, time_schedule, note || null, req.params.id]
      );

      this.sendSuccess(res, 200, 'Posting mabar berhasil diupdate', { id: Number(req.params.id) });
    } catch (error) {
      next(error);
    }
  };

  // Hapus matchmaking: hanya owner atau admin
  deleteMatchmaking = async (req, res, next) => {
    try {
      const [found] = await db.query('SELECT user_id FROM matchmakings WHERE id = ? LIMIT 1', [req.params.id]);
      if (found.length === 0) return next(new AppError('Posting mabar tidak ditemukan', 404));

      const isOwner = Number(found[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return next(new AppError('Tidak memiliki akses menghapus posting ini', 403));
      }

      await db.query('DELETE FROM matchmakings WHERE id = ?', [req.params.id]);
      this.sendSuccess(res, 200, 'Posting mabar berhasil dihapus');
    } catch (error) {
      next(error);
    }
  };

  // Ambil review by field dengan pagination
  getReviewsByField = async (req, res, next) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [rows] = await db.query(
        `SELECT r.*, u.name as reviewer_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.field_id = ?
         ORDER BY r.id DESC
         LIMIT ? OFFSET ?`,
        [req.params.fieldId, limit, offset]
      );

      const [countRows] = await db.query(
        `SELECT COUNT(*) as total FROM reviews WHERE field_id = ?`,
        [req.params.fieldId]
      );

      this.sendSuccess(res, 200, 'Ulasan lapangan', rows, {
        page,
        limit,
        totalItems: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit)
      });
    } catch (error) {
      next(error);
    }
  };

  // Buat review (user login)
  createReview = async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const field_id = Number(req.params.fieldId);
      const { rating, comment } = req.body;

      // Validasi kelengkapan data dari kode kedua
      if (!rating || !comment) {
        return next(new AppError('Data ulasan (rating, comment) harus diisi', 400));
      }

      // Validasi ketersediaan field dari kode pertama
      const [fieldRows] = await db.query('SELECT id FROM fields WHERE id = ?', [field_id]);
      if (fieldRows.length === 0) return next(new AppError('Lapangan tidak ditemukan', 404));

      const [result] = await db.query(
        'INSERT INTO reviews (user_id, field_id, rating, comment) VALUES (?, ?, ?, ?)',
        [user_id, field_id, rating, comment]
      );

      // Update rating rata-rata fields
      await db.query(
        'UPDATE fields SET rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE field_id = ?) WHERE id = ?',
        [field_id, field_id]
      );

      this.sendSuccess(res, 201, 'Ulasan berhasil ditambahkan', {
        id: result.insertId,
        field_id,
        rating,
        comment
      });
    } catch (error) {
      next(error);
    }
  };

  // Update review: owner/admin
  updateReview = async (req, res, next) => {
    try {
      const { rating, comment } = req.body;

      const [reviewData] = await db.query('SELECT user_id, field_id FROM reviews WHERE id = ?', [req.params.id]);
      if (reviewData.length === 0) return next(new AppError('Ulasan tidak ditemukan', 404));

      const isOwner = Number(reviewData[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Akses ditolak (bukan pemilik ulasan)', 403));

      await db.query('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?', [rating, comment, req.params.id]);

      const field_id = reviewData[0].field_id;
      await db.query(
        'UPDATE fields SET rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE field_id = ?) WHERE id = ?',
        [field_id, field_id]
      );

      this.sendSuccess(res, 200, 'Ulasan berhasil diupdate', { id: Number(req.params.id), rating, comment });
    } catch (error) {
      next(error);
    }
  };

  // Hapus review: owner/admin
  deleteReview = async (req, res, next) => {
    try {
      const [reviewData] = await db.query('SELECT user_id, field_id FROM reviews WHERE id = ?', [req.params.id]);
      if (reviewData.length === 0) return next(new AppError('Ulasan tidak ditemukan', 404));

      const isOwner = Number(reviewData[0].user_id) === Number(req.user.id);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) return next(new AppError('Akses ditolak (bukan pemilik ulasan)', 403));

      const field_id = reviewData[0].field_id;

      await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);

      await db.query(
        'UPDATE fields SET rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE field_id = ?) WHERE id = ?',
        [field_id, field_id]
      );

      this.sendSuccess(res, 200, 'Ulasan berhasil dihapus');
    } catch (error) {
      next(error);
    }
  };
}

export default new SocialController();