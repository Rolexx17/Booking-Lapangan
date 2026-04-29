import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class AuthController extends BaseController {
    constructor() { super('Auth'); }

    register = async (req, res) => {
        try {
            const { name, email, password } = req.body;
            
            if (!name || !email || !password) {
                return this.sendError(res, 400, "Semua field (name, email, password) harus diisi");
            }

            const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
            this.sendSuccess(res, 201, "Registrasi berhasil", { id: result.insertId, name, email });
        } catch (error) {
            this.sendError(res, 500, "Gagal registrasi (Email mungkin sudah terdaftar)", error.message);
        }
    };

    login = async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return this.sendError(res, 400, "Email dan password harus diisi");
            }

            const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
            
            if (rows.length === 0) return this.sendError(res, 401, "Email atau password salah");
            
            const token = Buffer.from(`${email}:${Date.now()}`).toString('base64'); // Dummy Token
            
            delete rows[0].password;
            this.sendSuccess(res, 200, "Login berhasil", { token, user: rows[0] });
        } catch (error) {
            this.sendError(res, 500, "Gagal login", error.message);
        }
    };

    getAllUsers = async (req, res) => {
        try {
            const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY id DESC');
            this.sendSuccess(res, 200, "Daftar semua user", rows);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil daftar user", error.message);
        }
    };

    getUserProfile = async (req, res) => {
        try {
            const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.params.id]);
            if (rows.length === 0) return this.sendError(res, 404, "User tidak ditemukan");
            this.sendSuccess(res, 200, "Profil user", rows[0]);
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil profil", error.message);
        }
    };

    updateUserProfile = async (req, res) => {
        try {
            const { name, email } = req.body;
            
            if (!name || !email) {
                return this.sendError(res, 400, "Name dan email harus diisi");
            }

            const [result] = await db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.params.id]);
            
            if (result.affectedRows === 0) return this.sendError(res, 404, "User tidak ditemukan");
            this.sendSuccess(res, 200, "Profil berhasil diupdate", { id: req.params.id, name, email });
        } catch (error) {
            this.sendError(res, 500, "Gagal update profil", error.message);
        }
    };

    deleteUser = async (req, res) => {
        try {
            const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) return this.sendError(res, 404, "User tidak ditemukan");
            
            this.sendSuccess(res, 200, "User berhasil dihapus");
        } catch (error) {
            this.sendError(res, 500, "Gagal menghapus user (Pastikan user tidak terikat dengan data pesanan/booking)", error.message);
        }
    };
}

export default new AuthController();