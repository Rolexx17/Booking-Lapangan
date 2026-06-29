// Middleware global penanganan error terpusat

import sendResponse from '../utils/response.js';

export function notFoundHandler(req, res) {
  return sendResponse(res, 404, 'Endpoint tidak ditemukan');
}

export function globalErrorHandler(err, req, res, next) {
  console.error('[Global Error]', err);

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  return sendResponse(
    res,
    statusCode,
    err.message || 'Terjadi kesalahan pada server',
    null,
    null,
    isProd
      ? [{ message: 'Internal Server Error' }]
      : [{ message: err?.stack || 'Internal Server Error' }]
  );
}