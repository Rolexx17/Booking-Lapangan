import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { query } from '../config/db.js';
import BaseController from '../utils/BaseController.js';

/*
  Controller untuk otentikasi dan manajemen user.
  - register: membuat user baru (hash password, cek duplikasi email).
  - login: memverifikasi kredensial, mendukung migrasi password plaintext ke bcrypt.
  - me: mengembalikan profil user yang sedang login (diambil dari middleware requireAuth).
  - getAllUsers: paginasi dan pencarian user (untuk admin/kasir).
  - getUserProfile: detail profil user berdasarkan id.
  - updateUserProfile: update nama dan email (cek duplikasi email).
  - deleteUser: menghapus user.
  Semua method menggunakan helper sendSuccess / sendError dari BaseController untuk respon API.
*/
class AuthController extends BaseController {
  constructor() {
    super('Auth');
  }

  // Registrasi user baru dengan validasi input, normalisasi email, hash password, dan penyimpanan ke DB.
  register = async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return this.sendError(res, 400, 'Semua field (name, email, password) harus diisi');
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      const existsRes = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
      if (existsRes.rows.length > 0) return this.sendError(res, 409, 'Email sudah terdaftar');

      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = role || 'customer';

      const insertRes = await query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, normalizedEmail, hashedPassword, userRole]
      );

      this.sendSuccess(res, 201, 'Registrasi berhasil', {
        id: insertRes.rows[0].id,
        name,
        email: normalizedEmail,
        role: userRole
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal registrasi', error.message);
    }
  };

  /* 
    Login:
    - Ambil user berdasarkan email yang dinormalisasi.
    - Jika password di DB sudah dalam format bcrypt, gunakan bcrypt.compare.
    - Jika password masih plaintext (migrasi lama), bandingkan langsung dan apabila cocok, hash password baru dan simpan.
    - Kembalikan JWT yang memuat userId dan role.
  */
  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return this.sendError(res, 400, 'Email dan password harus diisi');

      const normalizedEmail = String(email).trim().toLowerCase();
      const userRes = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
      if (userRes.rows.length === 0) return this.sendError(res, 401, 'Email atau password salah');

      const user = userRes.rows[0];
      let isPasswordValid = false;

      if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        isPasswordValid = password === user.password;
        if (isPasswordValid) {
          const newHash = await bcrypt.hash(password, 10);
          await query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
        }
      }

      if (!isPasswordValid) return this.sendError(res, 401, 'Email atau password salah');

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );

      delete user.password;
      this.sendSuccess(res, 200, 'Login berhasil', { token, user });
    } catch (error) {
      this.sendError(res, 500, 'Gagal login', error.message);
    }
  };

  // Mengembalikan informasi user yang sedang terautentikasi (req.user diset oleh middleware requireAuth).
  me = async (req, res) => {
    try {
      this.sendSuccess(res, 200, 'Profil user saat ini', req.user);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil profil', error.message);
    }
  };

  /*
    Mengambil daftar user dengan dukungan:
    - Paginasi (page, limit)
    - Pencarian q (name/email) menggunakan ILIKE
    - Filter role
    Hasil disertai metadata (totalItems, totalPages).
  */
  getAllUsers = async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const q = req.query.q ? String(req.query.q).trim() : '';
      const role = req.query.role ? String(req.query.role).trim() : '';
      const offset = (page - 1) * limit;

      let idx = 1;
      const where = [];
      const params = [];

      if (q) {
        where.push(`(name ILIKE $${idx} OR email ILIKE $${idx + 1})`);
        params.push(`%${q}%`, `%${q}%`);
        idx += 2;
      }
      if (role) {
        where.push(`role = $${idx}`);
        params.push(role);
        idx += 1;
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const dataSql = `
        SELECT id, name, email, role, created_at
        FROM users
        ${whereClause}
        ORDER BY id DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const countSql = `SELECT COUNT(*)::int as total FROM users ${whereClause}`;

      const dataRes = await query(dataSql, [...params, limit, offset]);
      const countRes = await query(countSql, params);

      this.sendSuccess(res, 200, 'Daftar semua user', dataRes.rows, {
        page,
        limit,
        totalItems: countRes.rows[0].total,
        totalPages: Math.ceil(countRes.rows[0].total / limit)
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil daftar user', error.message);
    }
  };

  // Mengambil profil user berdasarkan id (public untuk admin/kasir atau pemilik tergantung route).
  getUserProfile = async (req, res) => {
    try {
      const r = await query(
        'SELECT id, name, email, role, created_at FROM users WHERE id = $1 LIMIT 1',
        [req.params.id]
      );
      if (r.rows.length === 0) return this.sendError(res, 404, 'User tidak ditemukan');
      this.sendSuccess(res, 200, 'Profil user', r.rows[0]);
    } catch (error) {
      this.sendError(res, 500, 'Gagal mengambil profil', error.message);
    }
  };

  // Update nama dan email user; melakukan normalisasi email dan cek duplikasi sebelum update.
  updateUserProfile = async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return this.sendError(res, 400, 'Name dan email harus diisi');

      const normalizedEmail = String(email).trim().toLowerCase();

      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2 LIMIT 1',
        [normalizedEmail, req.params.id]
      );
      if (emailCheck.rows.length > 0) return this.sendError(res, 409, 'Email sudah digunakan user lain');

      const up = await query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [name, normalizedEmail, req.params.id]
      );
      if (up.rowCount === 0) return this.sendError(res, 404, 'User tidak ditemukan');

      this.sendSuccess(res, 200, 'Profil berhasil diupdate', {
        id: Number(req.params.id),
        name,
        email: normalizedEmail
      });
    } catch (error) {
      this.sendError(res, 500, 'Gagal update profil', error.message);
    }
  };

  // Menghapus user berdasarkan id; mengembalikan error jika tidak ditemukan.
  deleteUser = async (req, res) => {
    try {
      const del = await query('DELETE FROM users WHERE id = $1', [req.params.id]);
      if (del.rowCount === 0) return this.sendError(res, 404, 'User tidak ditemukan');
      this.sendSuccess(res, 200, 'User berhasil dihapus');
    } catch (error) {
      this.sendError(
        res,
        500,
        'Gagal menghapus user (Pastikan user tidak terikat dengan data pesanan/booking)',
        error.message
      );
    }
  };
}

export default new AuthController();