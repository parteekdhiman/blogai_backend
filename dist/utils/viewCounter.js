"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementViewCount = incrementViewCount;
exports.flushViewCounts = flushViewCounts;
const blog_model_1 = require("../models/blog.model");
const redis_1 = require("../config/redis");
/**
 * Increment view count for a blog post
 * Uses Redis for temporary storage and batches updates to MongoDB
 */
async function incrementViewCount(blogId) {
    try {
        const key = `blog_views:${blogId}`;
        // If Redis is not available, update DB directly
        if (!redis_1.redis) {
            await blog_model_1.BlogModel.updateOne({ _id: blogId }, { $inc: { views: 1 } });
            return;
        }
        // Increment in Redis
        const views = await redis_1.redis.incr(key);
        // Set expiry if first view
        if (views === 1) {
            await redis_1.redis.expire(key, 3600); // 1 hour
        }
        // Batch update to DB every 10 views
        if (views % 10 === 0) {
            await blog_model_1.BlogModel.updateOne({ _id: blogId }, { $inc: { views: 10 } });
            await redis_1.redis.decrby(key, 10);
        }
    }
    catch (error) {
        console.error('Error incrementing view count:', error);
    }
}
/**
 * Flush all pending view counts to database
 * Should be called on server shutdown
 */
async function flushViewCounts() {
    if (!redis_1.redis)
        return;
    try {
        const keys = await redis_1.redis.keys('blog_views:*');
        for (const key of keys) {
            const blogId = key.replace('blog_views:', '');
            const pendingViews = await redis_1.redis.get(key);
            if (pendingViews && parseInt(pendingViews) > 0) {
                await blog_model_1.BlogModel.updateOne({ _id: blogId }, { $inc: { views: parseInt(pendingViews) } });
                await redis_1.redis.del(key);
            }
        }
    }
    catch (error) {
        console.error('Error flushing view counts:', error);
    }
}
