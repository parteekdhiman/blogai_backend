"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = exports.checkOwnership = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const user_model_1 = __importDefault(require("../models/user.model"));
/**
 * Global authentication middleware to protect routes.
 * Validates JWT, checks user existence and email verification status.
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('No token provided');
        }
        const token = authHeader.substring(7); // Remove 'Bearer '
        // Verify token
        const payload = (0, jwt_1.verifyAccessToken)(token);
        // Check if user still exists
        const user = await user_model_1.default.findById(payload.userId).select('email role emailVerified deletedAt');
        if (!user || user.deletedAt) {
            throw new errors_1.UnauthorizedError('User not found');
        }
        if (!user.emailVerified) {
            throw new errors_1.UnauthorizedError('Email not verified');
        }
        // Attach user to request
        // Mongoose _id is an object, convert to string
        req.user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware for routes that benefit from user context.
 * Does not throw if token is missing or invalid.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwt_1.verifyAccessToken)(token);
            const user = await user_model_1.default.findById(payload.userId).select('email role deletedAt');
            if (user && !user.deletedAt) {
                req.user = {
                    userId: user._id.toString(),
                    email: user.email,
                    role: user.role
                };
            }
        }
        next();
    }
    catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Role-based authorization middleware.
 * Should be used after authenticate/protect middleware.
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError('Authentication required'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new errors_1.ForbiddenError('Insufficient permissions'));
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Resource ownership authorization middleware.
 * Ensures the user is either the owner or an ADMIN.
 */
const checkOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new errors_1.UnauthorizedError());
            }
            const resourceId = req.params.id;
            let resource;
            // Dynamic import to avoid circular dependencies if models import this file
            const { BlogModel } = await Promise.resolve().then(() => __importStar(require('../models/blog.model')));
            const { CommentModel } = await Promise.resolve().then(() => __importStar(require('../models/blog.model')));
            // Checking my previous write_to_file for models...
            // I wrote CommentModel inside `src/models/blog.model.ts` (Complexity 3 write).
            // So I should import from there.
            switch (resourceType) {
                case 'blog':
                    resource = await BlogModel.findById(resourceId).select('author');
                    break;
                case 'comment':
                    // Re-importing from blog.model since I defined it there
                    const { CommentModel } = await Promise.resolve().then(() => __importStar(require('../models/blog.model')));
                    resource = await CommentModel.findById(resourceId).select('author');
                    break;
            }
            if (!resource) {
                return next(new errors_1.NotFoundError('Resource not found'));
            }
            // Allow if owner or admin
            if (resource.author.toString() !== req.user.userId &&
                req.user.role !== 'ADMIN') {
                return next(new errors_1.ForbiddenError('You do not own this resource'));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkOwnership = checkOwnership;
/**
 * Legacy support for 'protect' name
 */
exports.protect = exports.authenticate;
