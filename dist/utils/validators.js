"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBlogSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name too long'),
        email: zod_1.z.string()
            .email('Invalid email address')
            .toLowerCase()
            .trim(),
        password: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Password must contain uppercase, lowercase, number and special character'),
        confirmPassword: zod_1.z.string()
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"]
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email'),
        password: zod_1.z.string().min(1, 'Password required')
    })
});
exports.verifyEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().uuid('Invalid token format')
    })
});
exports.resendVerificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address')
    })
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address')
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token is required'),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters')
    })
});
exports.createBlogSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string()
            .min(1, 'Title required')
            .max(200, 'Title too long'),
        content: zod_1.z.string()
            .min(50, 'Content too short (min 50 characters)'),
        excerpt: zod_1.z.string().max(500).optional(),
        coverImage: zod_1.z.string().url().optional(),
        categoryIds: zod_1.z.array(zod_1.z.string()).max(5).optional(),
        tags: zod_1.z.array(zod_1.z.string().max(30)).max(10).optional(),
        metaTitle: zod_1.z.string().max(60).optional(),
        metaDescription: zod_1.z.string().max(160).optional(),
        keywords: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['DRAFT', 'PUBLISHED']),
        aiGenerated: zod_1.z.boolean().optional(),
        aiModel: zod_1.z.string().optional(),
        originalPrompt: zod_1.z.string().optional()
    })
});
