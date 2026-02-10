import { BlogModel } from '@/models/blog.model'
import { redis } from '@/config/redis'

/**
 * Increment view count for a blog post
 * Uses Redis for temporary storage and batches updates to MongoDB
 */
export async function incrementViewCount(blogId: string): Promise<void> {
  try {
    const key = `blog_views:${blogId}`
    
    // If Redis is not available, update DB directly
    if (!redis) {
      await BlogModel.updateOne(
        { _id: blogId },
        { $inc: { views: 1 } }
      )
      return
    }
    
    // Increment in Redis
    const views = await redis.incr(key)
    
    // Set expiry if first view
    if (views === 1) {
      await redis.expire(key, 3600) // 1 hour
    }
    
    // Batch update to DB every 10 views
    if (views % 10 === 0) {
      await BlogModel.updateOne(
        { _id: blogId },
        { $inc: { views: 10 } }
      )
      await redis.decrby(key, 10)
    }
  } catch (error) {
    console.error('Error incrementing view count:', error)
  }
}

/**
 * Flush all pending view counts to database
 * Should be called on server shutdown
 */
export async function flushViewCounts(): Promise<void> {
  if (!redis) return

  try {
    const keys = await redis.keys('blog_views:*')
    
    for (const key of keys) {
      const blogId = key.replace('blog_views:', '')
      const pendingViews = await redis.get(key)
      
      if (pendingViews && parseInt(pendingViews) > 0) {
        await BlogModel.updateOne(
          { _id: blogId },
          { $inc: { views: parseInt(pendingViews) } }
        )
        await redis.del(key)
      }
    }
  } catch (error) {
    console.error('Error flushing view counts:', error)
  }
}
