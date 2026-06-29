// Middleware global penanganan error terpusat

import sendResponse from '../utils/response.js';

export function notFoundHandler(req, res) {
  return sendResponse(res, 404, 'Endpoint tidak ditemukan');
}

export function globalErrorHandler(err, req, res, next) {
  console.error('[Global Error]', err);

  return sendResponse(
    res,
    err.statusCode || 500,
    err.message || 'Terjadi kesalahan pada server',
    null,
    null,
    [{ message: err?.stack || 'Internal Server Error' }]
  );
}