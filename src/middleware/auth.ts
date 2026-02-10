import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '@/utils/jwt'
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/utils/errors'
import UserModel from '@/models/user.model'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: string
      }
    }
  }
}

/**
 * Global authentication middleware to protect routes.
 * Validates JWT, checks user existence and email verification status.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided')
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer '
    
    // Verify token
    const payload = verifyAccessToken(token)
    
    // Check if user still exists
    const user = await UserModel.findById(payload.userId).select('email role emailVerified deletedAt')
    
    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User not found')
    }
    
    if (!user.emailVerified) {
      throw new UnauthorizedError('Email not verified')
    }
    
    // Attach user to request
    // Mongoose _id is an object, convert to string
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    }
    
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Optional authentication middleware for routes that benefit from user context.
 * Does not throw if token is missing or invalid.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyAccessToken(token)
      
      const user = await UserModel.findById(payload.userId).select('email role deletedAt')
      
      if (user && !user.deletedAt) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          role: user.role
        }
      }
    }
    next()
  } catch (error) {
    // Ignore auth errors for optional auth
    next()
  }
}

/**
 * Role-based authorization middleware.
 * Should be used after authenticate/protect middleware.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'))
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'))
    }

    next()
  }
}

/**
 * Resource ownership authorization middleware.
 * Ensures the user is either the owner or an ADMIN.
 */
export const checkOwnership = (resourceType: 'blog' | 'comment') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError())
      }
      const resourceId = req.params.id
      let resource: any

      // Dynamic import to avoid circular dependencies if models import this file
      const { BlogModel } = await import('@/models/blog.model')
      const { CommentModel } = await import('@/models/blog.model') 
      // Checking my previous write_to_file for models...
      // I wrote CommentModel inside `src/models/blog.model.ts` (Complexity 3 write).
      // So I should import from there.

      switch (resourceType) {
        case 'blog':
          resource = await BlogModel.findById(resourceId).select('author')
          break
        case 'comment':
          // Re-importing from blog.model since I defined it there
          const { CommentModel } = await import('@/models/blog.model')
          resource = await CommentModel.findById(resourceId).select('author')
          break
      }

      if (!resource) {
        return next(new NotFoundError('Resource not found'))
      }

      // Allow if owner or admin
      if (
        resource.author.toString() !== req.user.userId &&
        req.user.role !== 'ADMIN'
      ) {
        return next(new ForbiddenError('You do not own this resource'))
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Legacy support for 'protect' name
 */
export const protect = authenticate
