import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import sendResponse from '../utils/response.js';

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

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return sendResponse(res, 401, 'Unauthorized');
    if (!allowedRoles.includes(req.user.role)) {
      return sendResponse(res, 403, 'Forbidden: tidak memiliki hak akses');
    }
    next();
  };
}

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