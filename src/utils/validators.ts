import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name too long'),
    email: z.string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  })
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password required')
  })
})

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().uuid('Invalid token format')
  })
})

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address')
  })
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address')
  })
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
})

export const createBlogSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title required')
      .max(200, 'Title too long'),
    content: z.string()
      .min(50, 'Content too short (min 50 characters)'),
    excerpt: z.string().max(500).optional(),
    coverImage: z.string().url().optional(),
    categoryIds: z.array(z.string()).max(5).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
    keywords: z.array(z.string()).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    aiGenerated: z.boolean().optional(),
    aiModel: z.string().optional(),
    originalPrompt: z.string().optional()
  })
})
