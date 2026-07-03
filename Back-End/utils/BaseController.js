import sendResponse from './response.js';

/*
  Kelas dasar untuk controller yang menyediakan helper:
  - sendSuccess: membungkus sendResponse untuk respon sukses.
  - sendError: mencatat error (jika ada) lalu memanggil sendResponse untuk respon error.
  Tujuan: konsistensi format respons di seluruh controller.
*/
export default class BaseController {
  constructor(resourceName) {
    this.resourceName = resourceName;
  }

  // Respons sukses standar
  sendSuccess(res, statusCode, message, data = null, meta = null) {
    sendResponse(res, statusCode, message, data, meta, null);
  }

  // Respons error standar + logging aman
  sendError(res, statusCode, message, errorDetails = null, errors = null) {
    if (errorDetails) {
      console.error(`[${this.resourceName} Error]`, errorDetails);
    }

    sendResponse(
      res,
      statusCode,
      message,
      null,
      null,
      errors || (errorDetails ? [{ message: String(errorDetails) }] : null)
    );
  }
}