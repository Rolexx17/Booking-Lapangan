import db from '../config/db.js';
import sendResponse from '../utils/response.js';

const getFields = async (req, res) => {
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
        const [totalRows] = await db.query(
            countQuery,
            search ? [`%${search}%`, `%${search}%`] : []
        );

        const totalItems = totalRows[0].total;

        sendResponse(res, 200, "Berhasil mengambil data lapangan", rows, {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        });
    } catch (error) {
        sendResponse(res, 500, "Terjadi kesalahan server", null, error.message);
    }
};

const getFieldById = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM fields WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return sendResponse(res, 404, "Lapangan tidak ditemukan");
        }

        sendResponse(res, 200, "Detail lapangan", rows[0]);
    } catch (error) {
        sendResponse(res, 500, "Terjadi kesalahan server", null, error.message);
    }
};

export default {
    getFields,
    getFieldById
};