"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogsService = exports.getBlogBySlugService = exports.createBlogService = void 0;
const blog_model_1 = require("@/models/blog.model");
const blog_model_2 = require("@/models/blog.model"); // Defined in same file usually or separate? Checking previous writes... I wrote CategoryModel in blog.model.ts
const audit_model_1 = require("@/models/audit.model");
const blog_model_3 = require("@/models/blog.model"); // Also in blog.model.ts
const errors_1 = require("@/utils/errors");
const slugify_1 = require("@/utils/slugify");
const helpers_1 = require("@/utils/helpers");
const redis_1 = require("@/config/redis");
const viewCounter_1 = require("@/utils/viewCounter");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Creates a new blog post with transactional safety.
 * Handles unique slug generation, category linking, and audit logging.
 */
const createBlogService = async (userId, input) => {
    const { title, content, excerpt, coverImage, categoryIds = [], tags = [], metaTitle, metaDescription, keywords = [], status, aiGenerated = false, aiModel, originalPrompt } = input;
    // Generate unique slug
    let slug = (0, slugify_1.generateSlug)(title);
    let counter = 1;
    while (await blog_model_1.BlogModel.findOne({ slug })) {
        slug = `${(0, slugify_1.generateSlug)(title)}-${counter}`;
        counter++;
    }
    // Calculate reading time
    const readTime = (0, helpers_1.calculateReadTime)(content);
    // Validate categories exist
    if (categoryIds.length > 0) {
        const categories = await blog_model_2.CategoryModel.find({
            _id: { $in: categoryIds }
        });
        if (categories.length !== categoryIds.length) {
            throw new errors_1.ApiError(400, 'One or more categories not found');
        }
    }
    const session = await mongoose_1.default.startSession();
    let blog;
    try {
        session.startTransaction();
        // Create blog
        const [newBlog] = await blog_model_1.BlogModel.create([{
                title,
                slug,
                content,
                excerpt: excerpt || content.substring(0, 200) + '...',
                coverImage,
                status,
                metaTitle: metaTitle || title,
                metaDescription: metaDescription || excerpt,
                keywords,
                tags,
                readTime,
                aiGenerated,
                aiModel,
                originalPrompt,
                author: userId, // Direct assignment of ObjectId
                categories: categoryIds, // Direct assignment of array of ObjectIds
                ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {})
            }], { session });
        // No need for separate BlogCategory creation! It's embedded in the `categories` array.
        // Create audit log
        await audit_model_1.AuditLogModel.create([{
                userId,
                action: 'BLOG_CREATED',
                entity: 'BLOG',
                entityId: newBlog._id.toString(),
                metadata: { status, aiGenerated }
            }], { session });
        await session.commitTransaction();
        blog = newBlog;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
    // Invalidate cache
    await (0, redis_1.deleteCachePattern)('blogs:list:*');
    return blog;
};
exports.createBlogService = createBlogService;
/**
 * Fetches a blog post by its unique slug.
 * Supports optional authentication for draft viewing and edit permission checks.
 * Uses Redis cache for public requests.
 */
const getBlogBySlugService = async (slug, userId) => {
    // Try to get from cache
    const cacheKey = `blog:slug:${slug}`;
    const cached = await (0, redis_1.getCached)(cacheKey);
    if (cached && !userId) {
        // Only use cache for non-authenticated requests
        // Increment view count async
        (0, viewCounter_1.incrementViewCount)(cached.id).catch(console.error);
        return cached;
    }
    // Fetch from database
    const blog = await blog_model_1.BlogModel.findOne({
        slug,
        deletedAt: null
    })
        .populate('author', 'name email image bio')
        .populate('categories') // Populates full category docs
        .lean(); // Return POJO for better performance
    if (!blog) {
        throw new errors_1.NotFoundError('Blog not found');
    }
    // Mongoose .lean() returns object with _id, so we can access properties directly
    // Type assertion or generous usage of 'any' if types are tricky with lean()
    const blogData = blog;
    // Draft visibility check
    if (blogData.status === 'DRAFT' && blogData.author._id.toString() !== userId) {
        throw new errors_1.NotFoundError('Blog not found');
    }
    // comments count
    const commentsCount = await blog_model_3.CommentModel.countDocuments({ blog: blogData._id });
    // Formatting response
    const formattedBlog = {
        ...blogData,
        id: blogData._id, // Map _id to id for frontend compatibility
        // categories are already populated
        commentsCount,
        canEdit: userId ? blogData.author._id.toString() === userId : false
    };
    // Cache for 5 minutes (only if published and public request)
    if (blogData.status === 'PUBLISHED' && !userId) {
        await (0, redis_1.setCache)(cacheKey, formattedBlog, 300);
    }
    // Increment view count (async, don't wait)
    (0, viewCounter_1.incrementViewCount)(blogData._id.toString()).catch(console.error);
    return formattedBlog;
};
exports.getBlogBySlugService = getBlogBySlugService;
/**
 * Fetches multiple blogs with optional filtering.
 */
const getBlogsService = async (filters = {}) => {
    const query = { deletedAt: null };
    if (filters.author) {
        query.author = filters.author;
    }
    const blogs = await blog_model_1.BlogModel.find(query)
        .populate('author', 'name email image')
        .populate('categories')
        .sort({ createdAt: -1 })
        .lean();
    return blogs.map((blog) => ({
        ...blog,
        id: blog._id
    }));
};
exports.getBlogsService = getBlogsService;
