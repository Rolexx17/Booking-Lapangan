import { query } from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class FieldController extends BaseController {
  constructor() {
    super('Field');
  }

  getFields = async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const search = String(req.query.q || '').trim();
      const offset = (page - 1) * limit;

      let idx = 1;
      const where = [];
      const params = [];

      if (search) {
        where.push(`(name ILIKE $${idx} OR type ILIKE $${idx + 1})`);
        params.push(`%${search}%`, `%${search}%`);
        idx += 2;
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const dataSql = `
        SELECT *
        FROM fields
        ${whereClause}
        ORDER BY id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const countSql = `SELECT COUNT(*)::int as total FROM fields ${whereClause}`;

      const dataRes = await query(dataSql, [...params, limit, offset]);
      const countRes = await query(countSql, params);

      this.sendSuccess(res, 200, 'Berhasil mengambil data lapangan', dataRes.rows, {
        page,
        limit,
        totalItems: countRes.rows[0].total,
        totalPages: Math.ceil(countRes.rows[0].total / limit)
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil data lapangan', error.message);
    }
  };

  getFieldById = async (req, res) => {
    try {
      const r = await query('SELECT * FROM fields WHERE id = $1 LIMIT 1', [req.params.id]);
      if (r.rows.length === 0) return this.sendError(res, 404, 'Lapangan tidak ditemukan');
      this.sendSuccess(res, 200, 'Detail lapangan', r.rows[0]);
    } catch (error) {
      this.sendError(res, 500, 'Kesalahan server', error.message);
    }
  };

  createField = async (req, res) => {
    try {
      const { name, type, price, image } = req.body;
      if (!name || !type || !price) return this.sendError(res, 400, 'Data lapangan (name, type, price) harus diisi');

      const r = await query(
        'INSERT INTO fields (name, type, price, image) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, type, price, image || null]
      );

      this.sendSuccess(res, 201, 'Lapangan berhasil ditambahkan', { id: r.rows[0].id, ...req.body });
    } catch (error) {
      this.sendError(res, 500, 'Gagal menambahkan lapangan', error.message);
    }
  };

  updateField = async (req, res) => {
    try {
      const { name, type, price, image } = req.body;
      if (!name || !type || !price) return this.sendError(res, 400, 'Data lapangan (name, type, price) harus diisi');

      const up = await query(
        'UPDATE fields SET name = $1, type = $2, price = $3, image = $4 WHERE id = $5',
        [name, type, price, image || null, req.params.id]
      );

      if (up.rowCount === 0) return this.sendError(res, 404, 'Lapangan tidak ditemukan');
      this.sendSuccess(res, 200, 'Lapangan berhasil diupdate', { id: Number(req.params.id), name, type, price, image });
    } catch (error) {
      this.sendError(res, 500, 'Gagal update data lapangan', error.message);
    }
  };

  deleteField = async (req, res) => {
    try {
      const del = await query('DELETE FROM fields WHERE id = $1', [req.params.id]);
      if (del.rowCount === 0) return this.sendError(res, 404, 'Lapangan tidak ditemukan');
      this.sendSuccess(res, 200, 'Lapangan berhasil dihapus');
    } catch (error) {
      this.sendError(res, 500, 'Gagal menghapus lapangan', error.message);
    }
  };

  getReviews = async (req, res) => {
    try {
      const r = await query(
        `SELECT r.id, r.rating, r.comment, u.name as reviewer_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.field_id = $1
         ORDER BY r.id DESC`,
        [req.params.id]
      );
      this.sendSuccess(res, 200, 'Ulasan lapangan', r.rows);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil ulasan', error.message);
    }
  };

  addReview = async (req, res) => {
    try {
      const { user_id, rating, comment } = req.body;
      const field_id = req.params.id;

      if (!user_id || !rating || !comment) {
        return this.sendError(res, 400, 'Data ulasan (user_id, rating, comment) harus diisi');
      }

      await query(
        'INSERT INTO reviews (user_id, field_id, rating, comment) VALUES ($1, $2, $3, $4)',
        [user_id, field_id, rating, comment]
      );

      const ratingRes = await query('SELECT AVG(rating) as avg_rating FROM reviews WHERE field_id = $1', [field_id]);
      const avgRating = ratingRes.rows[0].avg_rating ? Number(ratingRes.rows[0].avg_rating).toFixed(1) : 0;

      await query('UPDATE fields SET rating = $1 WHERE id = $2', [avgRating, field_id]);

      this.sendSuccess(res, 201, 'Ulasan berhasil ditambahkan');
    } catch (error) {
      this.sendError(res, 500, 'Gagal menambahkan ulasan', error.message);
    }
  };

  deleteReview = async (req, res) => {
    try {
      const field_id = req.params.id;
      const review_id = req.params.reviewId;

      const del = await query('DELETE FROM reviews WHERE id = $1 AND field_id = $2', [review_id, field_id]);
      if (del.rowCount === 0) return this.sendError(res, 404, 'Ulasan tidak ditemukan');

      const ratingRes = await query('SELECT AVG(rating) as avg_rating FROM reviews WHERE field_id = $1', [field_id]);
      const avgRating = ratingRes.rows[0].avg_rating ? Number(ratingRes.rows[0].avg_rating).toFixed(1) : 0;

      await query('UPDATE fields SET rating = $1 WHERE id = $2', [avgRating, field_id]);

      this.sendSuccess(res, 200, 'Ulasan berhasil dihapus dan rating diperbarui');
    } catch (error) {
      this.sendError(res, 500, 'Gagal menghapus ulasan', error.message);
    }
  };
}

export default new FieldController();