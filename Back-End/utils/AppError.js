/*
  Kelas error kustom untuk menyertakan statusCode dan details:
  - Digunakan di controller yang meneruskan error ke middleware globalErrorHandler.
  - Mempermudah mengontrol HTTP status code saat melempar error dari handler.
*/
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}