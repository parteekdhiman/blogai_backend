"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.BadRequestError = exports.AppError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    message;
    details;
    code;
    constructor(statusCode, message, details, code) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
        this.name = 'ApiError';
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
class ValidationError extends ApiError {
    constructor(message, details) {
        super(400, message, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(401, message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(403, message);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(404, message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * For compatibility with previous implementations
 */
class AppError extends ApiError {
    constructor(message, statusCode, code) {
        super(statusCode, message, undefined, code);
    }
}
exports.AppError = AppError;
class BadRequestError extends ApiError {
    constructor(message = 'Bad Request') {
        super(400, message);
    }
}
exports.BadRequestError = BadRequestError;
class InternalServerError extends ApiError {
    constructor(message = 'Internal Server Error') {
        super(500, message);
    }
}
exports.InternalServerError = InternalServerError;
