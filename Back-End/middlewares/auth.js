// Middleware autentikasi JWT dan otorisasi role / ownership

import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import sendResponse from '../utils/response.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return sendResponse(res, 401, 'Unauthorized: token tidak ditemukan');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return sendResponse(res, 401, 'Unauthorized: user tidak ditemukan');
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return sendResponse(res, 401, 'Unauthorized: token tidak valid', null, null, [
      { message: error.message }
    ]);
  }
}

// Otorisasi berbasis role
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return sendResponse(res, 401, 'Unauthorized');

    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, 'Forbidden: tidak memiliki hak akses');
    }

    next();
  };
}

// Otorisasi ownership / pemilik data
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