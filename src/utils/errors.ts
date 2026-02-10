export class ApiError extends Error {
  public code?: string

  constructor(
    public statusCode: number,
    public message: string,
    public details?: any,
    code?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, message, details)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message)
    this.name = 'NotFoundError'
  }
}

/**
 * For compatibility with previous implementations
 */
export class AppError extends ApiError {
  constructor(message: string, statusCode: number, code?: string) {
    super(statusCode, message, undefined, code)
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request') {
    super(400, message)
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error') {
    super(500, message)
  }
}
