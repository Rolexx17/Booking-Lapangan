import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import sendResponse from '../utils/response.js';

/*
  Middleware otorisasi dan autentikasi:
  - requireAuth: memeriksa header Authorization (Bearer token), memverifikasi JWT,
    mengambil data user dari DB dan memasukkannya ke req.user. Jika gagal, mengembalikan 401.
  - authorizeRoles(...allowedRoles): higher-order middleware yang memeriksa role user
    dan menolak akses bila tidak termasuk allowedRoles.
  - authorizeSelfOrRoles(paramUserIdKey, ...allowedRoles): middleware yang mengizinkan
    akses jika pemanggil adalah owner resource (params[paramUserIdKey]) atau memiliki salah satu role yang diizinkan.
  Semua respon error menggunakan helper sendResponse agar formatnya konsisten.
*/
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return sendResponse(res, 401, 'Unauthorized: token tidak ditemukan');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userRes = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1 LIMIT 1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return sendResponse(res, 401, 'Unauthorized: user tidak ditemukan');
    }

    req.user = userRes.rows[0];
    next();
  } catch (error) {
    return sendResponse(res, 401, 'Unauthorized: token tidak valid', null, null, [
      { message: error.message }
    ]);
  }
}

// Membatasi akses berdasarkan role yang diizinkan.
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return sendResponse(res, 401, 'Unauthorized');
    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, 'Forbidden: tidak memiliki hak akses');
    }
    next();
  };
}

// Mengizinkan akses jika pemanggil adalah pemilik resource (req.params[paramUserIdKey]) atau memiliki role tertentu.
export function authorizeSelfOrRoles(paramUserIdKey = 'id', ...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return sendResponse(res, 401, 'Unauthorized');

    const targetUserId = Number(req.params[paramUserIdKey]);
    const isOwner = Number(req.user.id) === targetUserId;
    const roleAllowed = allowedRoles.includes(req.user.role);

    if (!isOwner && !roleAllowed) {
      return sendResponse(res, 403, 'Forbidden: hanya pemilik data atau role tertentu');
    }

    next();
  };
}