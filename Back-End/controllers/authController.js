// Controller untuk Autentikasi dan Manajemen Pengguna

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class AuthController extends BaseController {
    constructor() {
        super('Auth');
    }

    // Register user baru
    register = async (req, res) => {
        try {
            const { name, email, password, role } = req.body;

            if (!name || !email || !password) {
                return this.sendError(res, 400, 'Semua field (name, email, password) harus diisi');
            }

            const normalizedEmail = String(email).trim().toLowerCase();

            // Cek email sudah dipakai
            const [exists] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
            if (exists.length > 0) {
                return this.sendError(res, 409, 'Email sudah terdaftar');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Role hanya boleh di-set admin/kasir oleh admin (di route nanti)
            const userRole = role || 'customer';

            const [result] = await db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, normalizedEmail, hashedPassword, userRole]
            );

            this.sendSuccess(res, 201, 'Registrasi berhasil', {
                id: result.insertId,
                name,
                email: normalizedEmail,
                role: userRole
            });
        } catch (error) {
            this.sendError(res, 500, 'Gagal registrasi', error.message);
        }
    };

    // Login user
    login = async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return this.sendError(res, 400, 'Email dan password harus diisi');
            }

            const normalizedEmail = String(email).trim().toLowerCase();

            const [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
            if (rows.length === 0) return this.sendError(res, 401, 'Email atau password salah');

            const user = rows[0];

            // 1) Coba bcrypt compare dulu
            let isPasswordValid = false;
            if (typeof user.password === 'string' && user.password.startsWith('$2')) {
                isPasswordValid = await bcrypt.compare(password, user.password);
            } else {
                // 2) Fallback untuk data lama plain text
                isPasswordValid = password === user.password;

                // Jika valid plain text -> upgrade otomatis ke hash
                if (isPasswordValid) {
                    const newHash = await bcrypt.hash(password, 10);
                    await db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
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

    // Profil user yang sedang login
    me = async (req, res) => {
        try {
            this.sendSuccess(res, 200, 'Profil user saat ini', req.user);
        } catch (error) {
            this.sendError(res, 500, 'Gagal mengambil profil', error.message);
        }
    };

    // Semua user (admin/kasir)
    getAllUsers = async (req, res) => {
        try {
            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
            const q = req.query.q ? String(req.query.q).trim() : '';
            const role = req.query.role ? String(req.query.role).trim() : '';
            const offset = (page - 1) * limit;

            let query = 'SELECT id, name, email, role, created_at FROM users';
            let countQuery = 'SELECT COUNT(*) as total FROM users';
            const params = [];
            const countParams = [];
            const where = [];

            if (q) {
                where.push('(name LIKE ? OR email LIKE ?)');
                params.push(`%${q}%`, `%${q}%`);
                countParams.push(`%${q}%`, `%${q}%`);
            }

            if (role) {
                where.push('role = ?');
                params.push(role);
                countParams.push(role);
            }

            if (where.length > 0) {
                query += ` WHERE ${where.join(' AND ')}`;
                countQuery += ` WHERE ${where.join(' AND ')}`;
            }

            query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows] = await db.query(query, params);
            const [totalRows] = await db.query(countQuery, countParams);

            this.sendSuccess(res, 200, 'Daftar semua user', rows, {
                page,
                limit,
                totalItems: totalRows[0].total,
                totalPages: Math.ceil(totalRows[0].total / limit)
            });
        } catch (error) {
            this.sendError(res, 500, 'Gagal mengambil daftar user', error.message);
        }
    };

    getUserProfile = async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
                [req.params.id]
            );
            if (rows.length === 0) return this.sendError(res, 404, 'User tidak ditemukan');

            this.sendSuccess(res, 200, 'Profil user', rows[0]);
        } catch (error) {
            this.sendError(res, 500, 'Gagal mengambil profil', error.message);
        }
    };

    updateUserProfile = async (req, res) => {
        try {
            const { name, email } = req.body;

            if (!name || !email) {
                return this.sendError(res, 400, 'Name dan email harus diisi');
            }

            const normalizedEmail = String(email).trim().toLowerCase();

            // Cek email bentrok user lain
            const [emailCheck] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
                [normalizedEmail, req.params.id]
            );
            if (emailCheck.length > 0) return this.sendError(res, 409, 'Email sudah digunakan user lain');

            const [result] = await db.query(
                'UPDATE users SET name = ?, email = ? WHERE id = ?',
                [name, normalizedEmail, req.params.id]
            );

            if (result.affectedRows === 0) return this.sendError(res, 404, 'User tidak ditemukan');

            this.sendSuccess(res, 200, 'Profil berhasil diupdate', {
                id: Number(req.params.id),
                name,
                email: normalizedEmail
            });
        } catch (error) {
            this.sendError(res, 500, 'Gagal update profil', error.message);
        }
    };

    deleteUser = async (req, res) => {
        try {
            const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) return this.sendError(res, 404, 'User tidak ditemukan');

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