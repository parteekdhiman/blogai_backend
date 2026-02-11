"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("./logger");
const errorHandler = (err, req, res, next) => {
    if (err instanceof errors_1.ApiError || err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code || 'API_ERROR',
                details: err.details,
            },
        });
    }
    // Handle specific library errors (Prisma, JWT, etc.)
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Database operation failed',
                code: 'DB_ERROR',
                details: err.meta,
            },
        });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Invalid token',
                code: 'INVALID_TOKEN',
            },
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Token expired',
                code: 'TOKEN_EXPIRED',
            },
        });
    }
    // Unexpected errors
    logger_1.logger.error('Unexpected Error:', err);
    return res.status(500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
            code: 'INTERNAL_SERVER_ERROR',
            ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
