// Base controller untuk logika respons yang digunakan bersama

import sendResponse from './response.js';

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