"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.getCached = getCached;
exports.setCache = setCache;
exports.deleteCache = deleteCache;
exports.deleteCachePattern = deleteCachePattern;
exports.getOrSet = getOrSet;
exports.checkRateLimit = checkRateLimit;
exports.setSession = setSession;
exports.getSession = getSession;
exports.deleteSession = deleteSession;
exports.disconnect = disconnect;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("@middleware/logger");
const env_config_1 = require("./env.config");
/**
 * Advanced Redis Client Configuration
 * Includes: Connection Pooling, Reconnection Strategy, and Cache Utilities
 */
// Check if Redis is configured
const isRedisConfigured = env_config_1.config.redis.host && env_config_1.config.redis.port && env_config_1.config.redis.password;
let redis = null;
exports.redis = redis;
if (isRedisConfigured) {
    exports.redis = redis = new ioredis_1.default({
        host: env_config_1.config.redis.host,
        port: env_config_1.config.redis.port,
        username: 'default',
        password: env_config_1.config.redis.password,
        // TLS settings (Optional)
        tls: env_config_1.config.redis.tls ? {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
        } : undefined,
        db: 0,
        // Stability options
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: false,
        retryStrategy(times) {
            if (times > 3)
                return null; // Stop after 3 attempts
            return Math.min(times * 100, 3000);
        },
        reconnectOnError(err) {
            if (err.message.includes('READONLY'))
                return true;
            return false;
        }
    });
}
/**
 * Event Handlers
 */
if (redis) {
    redis.on('connect', () => {
        logger_1.logger.info('✅ Redis connected');
    });
    redis.on('error', (err) => {
        logger_1.logger.error('❌ Redis error:', err);
    });
    redis.on('ready', () => {
        logger_1.logger.info('🚀 Redis ready to accept commands');
    });
    redis.on('close', () => {
        logger_1.logger.warn('Redis connection closed');
    });
}
/**
 * Cache Utilities
 */
/**
 * Get Cached Data
 */
async function getCached(key) {
    const _redis = redis;
    if (!_redis)
        return null;
    try {
        const data = await _redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (err) {
        logger_1.logger.error(`Error getting cache for key ${key}:`, err);
        return null;
    }
}
/**
 * Set Cached Data
 */
async function setCache(key, data, ttl = 3600) {
    const _redis = redis;
    if (!_redis)
        return;
    try {
        await _redis.setex(key, ttl, JSON.stringify(data));
    }
    catch (err) {
        logger_1.logger.error(`Error setting cache for key ${key}:`, err);
    }
}
/**
 * Delete Cache
 */
async function deleteCache(key) {
    const _redis = redis;
    if (!_redis)
        return;
    try {
        await _redis.del(key);
    }
    catch (err) {
        logger_1.logger.error(`Error deleting cache for key ${key}:`, err);
    }
}
/**
 * Delete Pattern
 */
async function deleteCachePattern(pattern) {
    const _redis = redis;
    if (!_redis)
        return;
    try {
        const keys = await _redis.keys(pattern);
        if (keys.length > 0) {
            await _redis.del(...keys);
        }
    }
    catch (err) {
        logger_1.logger.error(`Error deleting cache pattern ${pattern}:`, err);
    }
}
/**
 * Get or Set (Cache-Aside Pattern)
 */
async function getOrSet(key, fetcher, ttl = 3600) {
    const cached = await getCached(key);
    if (cached)
        return cached;
    const data = await fetcher();
    await setCache(key, data, ttl);
    return data;
}
/**
 * Rate Limiting Helper
 */
async function checkRateLimit(key, limit, window) {
    const _redis = redis;
    if (!_redis) {
        return { allowed: true, remaining: limit };
    }
    try {
        const current = await _redis.incr(key);
        if (current === 1) {
            await _redis.expire(key, window);
        }
        const remaining = Math.max(0, limit - current);
        return {
            allowed: current <= limit,
            remaining
        };
    }
    catch (err) {
        logger_1.logger.error(`Error checking rate limit for key ${key}:`, err);
        return { allowed: true, remaining: limit }; // Fail open for rate limiting
    }
}
/**
 * Session Storage Helpers
 */
async function setSession(sessionId, data, ttl = 86400 // 24 hours default
) {
    await setCache(`session:${sessionId}`, data, ttl);
}
async function getSession(sessionId) {
    return await getCached(`session:${sessionId}`);
}
async function deleteSession(sessionId) {
    await deleteCache(`session:${sessionId}`);
}
/**
 * Disconnect Helper
 */
async function disconnect() {
    const _redis = redis;
    if (!_redis)
        return;
    try {
        await _redis.quit();
        logger_1.logger.info('Redis disconnected');
    }
    catch (err) {
        logger_1.logger.error('Error during Redis disconnection:', err);
    }
}
exports.default = redis;
