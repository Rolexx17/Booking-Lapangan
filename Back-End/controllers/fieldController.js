import db from '../config/db.js';
import BaseController from '../utils/BaseController.js';

class FieldController extends BaseController {
    constructor() {
        super('Field');
    }

    getFields = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.q || '';
            const offset = (page - 1) * limit;

            let query = `SELECT * FROM fields`;
            let countQuery = `SELECT COUNT(*) as total FROM fields`;
            const queryParams = [];

            if (search) {
                query += ` WHERE name LIKE ? OR type LIKE ?`;
                countQuery += ` WHERE name LIKE ? OR type LIKE ?`;
                queryParams.push(`%${search}%`, `%${search}%`);
            }

            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(limit, offset);

            const [rows] = await db.query(query, queryParams);
            const [totalRows] = await db.query(countQuery, search ? [`%${search}%`, `%${search}%`] : []);

            this.sendSuccess(res, 200, "Berhasil mengambil data lapangan", rows, {
                page, limit, totalItems: totalRows[0].total, totalPages: Math.ceil(totalRows[0].total / limit)
            });
        } catch (error) {
            this.sendError(res, 500, "Gagal mengambil data lapangan", error.message);
        }
    };

    getFieldById = async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM fields WHERE id = ?', [req.params.id]);
            if (rows.length === 0) return this.sendError(res, 404, "Lapangan tidak ditemukan");
            this.sendSuccess(res, 200, "Detail lapangan", rows[0]);
        } catch (error) {
            this.sendError(res, 500, "Kesalahan server", error.message);
        }
    };

    createField = async (req, res) => {
        try {
            const { name, type, price, image } = req.body;
            
            if (!name || !type || !price) {
                return this.sendError(res, 400, "Data lapangan (name, type, price) harus diisi");
            }

            const [result] = await db.query('INSERT INTO fields (name, type, price, image) VALUES (?, ?, ?, ?)', [name, type, price, image]);
            this.sendSuccess(res, 201, "Lapangan berhasil ditambahkan", { id: result.insertId, ...req.body });
        } catch (error) {
            this.sendError(res, 500, "Gagal menambahkan lapangan", error.message);
        }
    };

    updateField = async (req, res) => {
        try {
            const { name, type, price, image } = req.body;
            
            if (!name || !type || !price) {
                return this.sendError(res, 400, "Data lapangan (name, type, price) harus diisi");
            }

            const [result] = await db.query(
                'UPDATE fields SET name = ?, type = ?, price = ?, image = ? WHERE id = ?', 
                [name, type, price, image, req.params.id]
            );
            
            if (result.affectedRows === 0) return this.sendError(res, 404, "Lapangan tidak ditemukan");
            this.sendSuccess(res, 200, "Lapangan berhasil diupdate", { id: req.params.id, name, type, price, image });
        } catch (error) {
            this.sendError(res, 500, "Gagal update data lapangan", error.message);
        }
    };

    deleteField = async (req, res) => {
        try {
            const [result] = await db.query('DELETE FROM fields WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) return this.sendError(res, 404, "Lapangan tidak ditemukan");
            
            this.sendSuccess(res, 200, "Lapangan berhasil dihapus");
        } catch (error) {
            this.sendError(res, 500, "Gagal menghapus lapangan", error.message);
        }
    };
}

export default new FieldController();