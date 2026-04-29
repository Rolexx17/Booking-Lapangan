import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class AuthController extends BaseController {
    constructor() { super('Auth'); }

    register = async (req, res) => {
        try {
            const { name, email, password } = req.body;
            const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
            this.sendSuccess(res, 201, "Registrasi berhasil", { id: result.insertId, name, email });
        } catch (error) {
            this.sendError(res, 500, "Gagal registrasi (Email mungkin sudah terdaftar)", error.message);
        }
    };

    login = async (req, res) => {
        try {
            const { email, password } = req.body;
            const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
            
            if (rows.length === 0) return this.sendError(res, 401, "Email atau password salah");
            
            const token = Buffer.from(`${email}:${Date.now()}`).toString('base64'); // Dummy Token sederhana
            
            delete rows[0].password; // Hilangkan password dari response
            this.sendSuccess(res, 200, "Login berhasil", { token, user: rows[0] });
        } catch (error) {
            this.sendError(res, 500, "Gagal login", error.message);
        }
    };
}

export default new AuthController();