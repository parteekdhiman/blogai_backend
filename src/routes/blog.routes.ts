import express from 'express'
import { validate } from '@/middleware/validation'
import { createBlogSchema } from '@/utils/validators'
import { createBlog, getBlogBySlug, getBlogs } from '@/controllers/blog.controller'
import { authenticate, optionalAuth } from '@/middleware/auth'

const router = express.Router()

/**
 * Public Routes
 */
/**
 * Public Routes
 */
router.get('/', optionalAuth, getBlogs)
router.get('/:slug', optionalAuth, getBlogBySlug)

/**
 * Protected Routes
 */
router.post(
  '/',
  authenticate,
  validate(createBlogSchema),
  createBlog
)

export default router
