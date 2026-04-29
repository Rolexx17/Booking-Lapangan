import sendResponse from './response.js';

export default class BaseController {
    constructor(resourceName) {
        this.resourceName = resourceName;
    }

    sendSuccess(res, statusCode, message, data = null, meta = null) {
        sendResponse(res, statusCode, message, data, meta);
    }

    sendError(res, statusCode, message, errorDetails = null) {
        console.error(`[${this.resourceName} Error]`, errorDetails);
        sendResponse(res, statusCode, message, null, errorDetails);
    }
}