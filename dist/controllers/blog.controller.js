"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogs = exports.getBlogBySlug = exports.createBlog = void 0;
const blog_service_1 = require("@/services/blog.service");
/**
 * Controller for creating a new blog post.
 */
const createBlog = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const blogData = req.body;
        const blog = await (0, blog_service_1.createBlogService)(userId, blogData);
        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: blog
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createBlog = createBlog;
/**
 * Controller for fetching a blog post by its slug.
 * Supports optional authentication context.
 */
const getBlogBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const userId = req.user?.userId;
        const blog = await (0, blog_service_1.getBlogBySlugService)(slug, userId);
        res.json({
            success: true,
            data: blog
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBlogBySlug = getBlogBySlug;
/**
 * Controller for fetching all blogs (with optional filters).
 */
const getBlogs = async (req, res, next) => {
    try {
        const userId = req.query.userId;
        const { getBlogsService } = require('@/services/blog.service');
        const blogs = await getBlogsService({ author: userId });
        res.json({
            success: true,
            data: blogs
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBlogs = getBlogs;
