import Redis from 'ioredis';
import { logger } from '@middleware/logger';
import { config } from './env.config';

/**
 * Advanced Redis Client Configuration
 * Includes: Connection Pooling, Reconnection Strategy, and Cache Utilities
 */

// Check if Redis is configured
const isRedisConfigured = config.redis.host && config.redis.port && config.redis.password;

let redis: Redis | null = null;

if (isRedisConfigured) {
  redis = new Redis({
    host: config.redis.host!,
    port: config.redis.port!,
    username: 'default',
    password: config.redis.password!,

    // TLS settings (Optional)
    tls: config.redis.tls ? {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    } : undefined,

    db: 0,

    // Stability options
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,

    retryStrategy(times) {
      if (times > 3) return null; // Stop after 3 attempts
      return Math.min(times * 100, 3000);
    },

    reconnectOnError(err) {
      if (err.message.includes('READONLY')) return true;
      return false;
    }
  });
}


/**
 * Event Handlers
 */
if (redis) {
  redis.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  redis.on('error', (err) => {
    logger.error('❌ Redis error:', err);
  });

  redis.on('ready', () => {
    logger.info('🚀 Redis ready to accept commands');
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });
}

/**
 * Cache Utilities
 */

/**
 * Get Cached Data
 */
async function getCached<T>(key: string): Promise<T | null> {
  const _redis = redis;
  if (!_redis) return null;
  
  try {
    const data = await _redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Error getting cache for key ${key}:`, err);
    return null;
  }
}

/**
 * Set Cached Data
 */
async function setCache<T>(
  key: string, 
  data: T, 
  ttl: number = 3600
): Promise<void> {
  const _redis = redis;
  if (!_redis) return;
  
  try {
    await _redis.setex(key, ttl, JSON.stringify(data));
  } catch (err) {
    logger.error(`Error setting cache for key ${key}:`, err);
  }
}

/**
 * Delete Cache
 */
async function deleteCache(key: string): Promise<void> {
  const _redis = redis;
  if (!_redis) return;
  
  try {
    await _redis.del(key);
  } catch (err) {
    logger.error(`Error deleting cache for key ${key}:`, err);
  }
}

/**
 * Delete Pattern
 */
async function deleteCachePattern(pattern: string): Promise<void> {
  const _redis = redis;
  if (!_redis) return;
  
  try {
    const keys = await _redis.keys(pattern);
    if (keys.length > 0) {
      await _redis.del(...keys);
    }
  } catch (err) {
    logger.error(`Error deleting cache pattern ${pattern}:`, err);
  }
}

/**
 * Get or Set (Cache-Aside Pattern)
 */
async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached) return cached;
  
  const data = await fetcher();
  await setCache(key, data, ttl);
  return data;
}

/**
 * Rate Limiting Helper
 */
async function checkRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<{ allowed: boolean; remaining: number }> {
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
  } catch (err) {
    logger.error(`Error checking rate limit for key ${key}:`, err);
    return { allowed: true, remaining: limit }; // Fail open for rate limiting
  }
}

/**
 * Session Storage Helpers
 */
async function setSession(
  sessionId: string,
  data: any,
  ttl: number = 86400 // 24 hours default
): Promise<void> {
  await setCache(`session:${sessionId}`, data, ttl);
}

async function getSession(sessionId: string): Promise<any | null> {
  return await getCached<any>(`session:${sessionId}`);
}

async function deleteSession(sessionId: string): Promise<void> {
  await deleteCache(`session:${sessionId}`);
}

/**
 * Disconnect Helper
 */
async function disconnect(): Promise<void> {
  const _redis = redis;
  if (!_redis) return;
  
  try {
    await _redis.quit();
    logger.info('Redis disconnected');
  } catch (err) {
    logger.error('Error during Redis disconnection:', err);
  }
}

export {
  redis,
  getCached,
  setCache,
  deleteCache,
  deleteCachePattern,
  getOrSet,
  checkRateLimit,
  setSession,
  getSession,
  deleteSession,
  disconnect
};

export default redis;
