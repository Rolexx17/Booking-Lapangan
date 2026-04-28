const sendResponse = (res, statusCode, message, data = null, meta = null) => {
    const response = {
        success: statusCode >= 200 && statusCode < 300,
        message,
        data
    };
    if (meta) response.meta = meta;
    
    res.status(statusCode).json(response);
};

export default sendResponse;