import { BlogModel } from '@/models/blog.model'
import { CategoryModel } from '@/models/blog.model' // Defined in same file usually or separate? Checking previous writes... I wrote CategoryModel in blog.model.ts
import { AuditLogModel } from '@/models/audit.model'
import { CommentModel } from '@/models/blog.model' // Also in blog.model.ts
import { ApiError, NotFoundError } from '@/utils/errors'
import { generateSlug } from '@/utils/slugify'
import { calculateReadTime } from '@/utils/helpers'
import { deleteCachePattern, getCached, setCache } from '@/config/redis'
import { incrementViewCount } from '@/utils/viewCounter'
import mongoose from 'mongoose'

interface CreateBlogInput {
  title: string
  content: string
  excerpt?: string
  coverImage?: string
  categoryIds?: string[]
  tags?: string[]
  metaTitle?: string
  metaDescription?: string
  keywords?: string[]
  status: 'DRAFT' | 'PUBLISHED'
  aiGenerated?: boolean
  aiModel?: string
  originalPrompt?: string
}

/**
 * Creates a new blog post with transactional safety.
 * Handles unique slug generation, category linking, and audit logging.
 */
export const createBlogService = async (
  userId: string,
  input: CreateBlogInput
) => {
  const {
    title,
    content,
    excerpt,
    coverImage,
    categoryIds = [],
    tags = [],
    metaTitle,
    metaDescription,
    keywords = [],
    status,
    aiGenerated = false,
    aiModel,
    originalPrompt
  } = input

  // Generate unique slug
  let slug = generateSlug(title)
  let counter = 1
  while (await BlogModel.findOne({ slug })) {
    slug = `${generateSlug(title)}-${counter}`
    counter++
  }

  // Calculate reading time
  const readTime = calculateReadTime(content)

  // Validate categories exist
  if (categoryIds.length > 0) {
    const categories = await CategoryModel.find({
      _id: { $in: categoryIds }
    })
    if (categories.length !== categoryIds.length) {
      throw new ApiError(400, 'One or more categories not found')
    }
  }

  const session = await mongoose.startSession()
  let blog

  try {
    session.startTransaction()

    // Create blog
    const [newBlog] = await BlogModel.create([{
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
    }], { session })

    // No need for separate BlogCategory creation! It's embedded in the `categories` array.

    // Create audit log
    await AuditLogModel.create([{
      userId,
      action: 'BLOG_CREATED',
      entity: 'BLOG',
      entityId: newBlog._id.toString(),
      metadata: { status, aiGenerated }
    }], { session })

    await session.commitTransaction()
    blog = newBlog
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }

  // Invalidate cache
  await deleteCachePattern('blogs:list:*')
  
  return blog
}

/**
 * Fetches a blog post by its unique slug.
 * Supports optional authentication for draft viewing and edit permission checks.
 * Uses Redis cache for public requests.
 */
export const getBlogBySlugService = async (
  slug: string,
  userId?: string
) => {
  // Try to get from cache
  const cacheKey = `blog:slug:${slug}`
  const cached = await getCached<any>(cacheKey)

  if (cached && !userId) {
    // Only use cache for non-authenticated requests
    // Increment view count async
    incrementViewCount(cached.id).catch(console.error)
    return cached
  }

  // Fetch from database
  const blog = await BlogModel.findOne({
    slug,
    deletedAt: null
  })
  .populate('author', 'name email image bio')
  .populate('categories') // Populates full category docs
  .lean() // Return POJO for better performance

  if (!blog) {
    throw new NotFoundError('Blog not found')
  }

  // Mongoose .lean() returns object with _id, so we can access properties directly
  // Type assertion or generous usage of 'any' if types are tricky with lean()
  const blogData = blog as any

  // Draft visibility check
  if (blogData.status === 'DRAFT' && blogData.author._id.toString() !== userId) {
    throw new NotFoundError('Blog not found')
  }

  // comments count
  const commentsCount = await CommentModel.countDocuments({ blog: blogData._id })

  // Formatting response
  const formattedBlog = {
    ...blogData,
    id: blogData._id, // Map _id to id for frontend compatibility
    // categories are already populated
    commentsCount,
    canEdit: userId ? blogData.author._id.toString() === userId : false
  }

  // Cache for 5 minutes (only if published and public request)
  if (blogData.status === 'PUBLISHED' && !userId) {
    await setCache(cacheKey, formattedBlog, 300)
  }

  // Increment view count (async, don't wait)
  incrementViewCount(blogData._id.toString()).catch(console.error)

  return formattedBlog
}

/**
 * Fetches multiple blogs with optional filtering.
 */
export const getBlogsService = async (filters: { author?: string } = {}) => {
  const query: any = { deletedAt: null }
  
  if (filters.author) {
    query.author = filters.author
  }

  const blogs = await BlogModel.find(query)
    .populate('author', 'name email image')
    .populate('categories')
    .sort({ createdAt: -1 })
    .lean()

  return blogs.map((blog: any) => ({
    ...blog,
    id: blog._id
  }))
}
