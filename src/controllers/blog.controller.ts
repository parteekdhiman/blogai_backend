import { Request, Response, NextFunction } from 'express'
import { createBlogService, getBlogBySlugService } from '@/services/blog.service'

/**
 * Controller for creating a new blog post.
 */
export const createBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId
    const blogData = req.body
    
    const blog = await createBlogService(userId, blogData)
    
    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Controller for fetching a blog post by its slug.
 * Supports optional authentication context.
 */
export const getBlogBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params
    const userId = req.user?.userId
    
    const blog = await getBlogBySlugService(slug, userId)
    
    res.json({
      success: true,
      data: blog
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Controller for fetching all blogs (with optional filters).
 */
export const getBlogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.query.userId as string
    const { getBlogsService } = require('@/services/blog.service')
    const blogs = await getBlogsService({ author: userId })
    
    res.json({
      success: true,
      data: blogs
    })
  } catch (error) {
    next(error)
  }
}
