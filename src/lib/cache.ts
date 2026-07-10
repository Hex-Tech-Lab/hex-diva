import { Redis } from '@upstash/redis';

const redisUrl = process.env.REDIS_URL;
const redisToken = process.env.REDIS_TOKEN;

if (!redisUrl) {
  console.warn('REDIS_URL not configured - caching disabled');
}

// Initialize Redis client
export const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

// Cache key helpers
export const CACHE_KEYS = {
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_INVENTORY: (id: string) => `inventory:${id}`,
  PRODUCTS_LIST: (page: number, limit: number) => `products:${page}:${limit}`,
  USER_CART: (userId: string) => `cart:${userId}`,
  USER_WISHLIST: (userId: string) => `wishlist:${userId}`,
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  REFERRAL_STATS: (userId: string) => `referral:${userId}`,
  SEARCH_RESULTS: (query: string) => `search:${query.toLowerCase()}`,
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
};

const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? (JSON.parse(value as string) as T) : null;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

export async function deleteCached(key: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 900000
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = CACHE_KEYS.RATE_LIMIT(identifier);
  if (!redis) {
    return { allowed: true, remaining: limit, resetTime: 0 };
  }

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);
    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: limit, resetTime: 0 };
  }
}

export function isCacheAvailable(): boolean {
  return redis !== null;
}

/**
 * Product-specific cache operations
 */
export const productCache = {
  async get(productId: string) {
    return getCached(CACHE_KEYS.PRODUCT(productId));
  },
  async set(productId: string, data: any) {
    return setCached(CACHE_KEYS.PRODUCT(productId), data, CACHE_TTL.LONG);
  },
  async delete(productId: string) {
    return deleteCached(CACHE_KEYS.PRODUCT(productId));
  },
  async getInventory(productId: string) {
    return getCached(CACHE_KEYS.PRODUCT_INVENTORY(productId));
  },
  async setInventory(productId: string, quantity: number) {
    return setCached(
      CACHE_KEYS.PRODUCT_INVENTORY(productId),
      { quantity },
      CACHE_TTL.SHORT
    );
  },
  async deleteInventory(productId: string) {
    return deleteCached(CACHE_KEYS.PRODUCT_INVENTORY(productId));
  },
};

/**
 * Search cache operations
 */
export const searchCache = {
  async getResults(query: string) {
    return getCached(CACHE_KEYS.SEARCH_RESULTS(query));
  },
  async setResults(query: string, results: any[]) {
    return setCached(
      CACHE_KEYS.SEARCH_RESULTS(query),
      results,
      CACHE_TTL.MEDIUM
    );
  },
  async invalidateAll() {
    if (!redis) return 0;
    try {
      const keys = await redis.keys('search:*');
      let deleted = 0;
      for (const key of keys) {
        const result = await redis.del(key);
        deleted += result;
      }
      return deleted;
    } catch (error) {
      console.error('Error invalidating search cache:', error);
      return 0;
    }
  },
};

/**
 * Convenience functions for common cache operations
 */
export async function invalidateProductCache(productId: string): Promise<boolean> {
  return productCache.delete(productId);
}

export async function invalidateProductInventory(
  productId: string
): Promise<boolean> {
  return productCache.deleteInventory(productId);
}

export async function invalidateCachePattern(pattern: string): Promise<number> {
  if (!redis) return 0;
  try {
    const keys = await redis.keys(pattern);
    let deleted = 0;
    for (const key of keys) {
      const result = await redis.del(key);
      deleted += result;
    }
    return deleted;
  } catch (error) {
    console.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
    return 0;
  }
}

export default redis;
