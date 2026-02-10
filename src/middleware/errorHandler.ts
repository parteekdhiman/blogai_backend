import { Request, Response, NextFunction } from 'express';
import { ApiError, AppError } from '../utils/errors';
import { logger } from '@middleware/logger';

export const errorHandler = (
  err: Error | ApiError | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError || err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: (err as any).code || 'API_ERROR',
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
        details: (err as any).meta,
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
  logger.error('Unexpected Error:', err);

  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
    },
  });
};
