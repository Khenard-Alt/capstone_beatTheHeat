"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode ?? 500;
    const message = statusCode >= 500 ? 'Internal server error' : err.message;
    if (statusCode >= 500) {
        console.error('Unhandled error:', err);
    }
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.middleware.js.map