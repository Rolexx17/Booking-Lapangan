import sendResponse from '../utils/response.js';

/*
  Middleware penanganan error global dan handler 404.
  - notFoundHandler: mengembalikan respons 404 untuk endpoint yang tidak ditemukan.
  - globalErrorHandler: menangani error yang dilemparkan di route/handler, mencatat stack di server
    dan mengembalikan response berbentuk terformat (produksi menyembunyikan stack trace).
*/
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