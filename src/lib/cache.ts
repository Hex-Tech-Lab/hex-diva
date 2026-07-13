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

/**
 * Retrieve a cached value by key
 * @param key - Redis cache key
 * @returns Parsed cached value of type T, or null if not found or cache unavailable
 */
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

/**
 * Store a value in cache with optional TTL
 * @param key - Redis cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param ttl - Time-to-live in seconds (default: 1800s/30min)
 * @returns True if set successfully, false if cache unavailable or error occurred
 */
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

/**
 * Delete a cached value by key
 * @param key - Redis cache key to delete
 * @returns True if key was deleted, false if not found, cache unavailable, or error occurred
 */
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

/**
 * Check rate limit for an identifier using atomic Redis increment
 * Uses atomic operations to prevent race conditions across concurrent requests
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param limit - Maximum requests allowed in window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 900000ms/15min)
 * @returns Object with allowed (bool), remaining count, and resetTime (unix ms)
 */
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

/**
 * Check if Redis cache is available
 * @returns True if Redis client is initialized and available for use
 */
export function isCacheAvailable(): boolean {
  return redis !== null;
}

/**
 * Product-specific cache operations
 */
export const productCache = {
  /**
   * Get cached product data (1 hour TTL)
   * @param productId - Shopify product ID
   * @returns Cached product object or null if not found
   */
  async get(productId: string) {
    return getCached(CACHE_KEYS.PRODUCT(productId));
  },
  /**
   * Cache product data with 1 hour TTL
   * @param productId - Shopify product ID
   * @param data - Product object to cache
   * @returns True if set successfully
   */
  async set(productId: string, data: any) {
    return setCached(CACHE_KEYS.PRODUCT(productId), data, CACHE_TTL.LONG);
  },
  /**
   * Delete cached product data
   * @param productId - Shopify product ID
   * @returns True if deleted successfully
   */
  async delete(productId: string) {
    return deleteCached(CACHE_KEYS.PRODUCT(productId));
  },
  /**
   * Get cached inventory for product (5 minute TTL)
   * @param productId - Shopify product ID
   * @returns Cached inventory object or null if not found
   */
  async getInventory(productId: string) {
    return getCached(CACHE_KEYS.PRODUCT_INVENTORY(productId));
  },
  /**
   * Cache product inventory with 5 minute TTL
   * @param productId - Shopify product ID
   * @param quantity - Current stock quantity
   * @returns True if set successfully
   */
  async setInventory(productId: string, quantity: number) {
    return setCached(
      CACHE_KEYS.PRODUCT_INVENTORY(productId),
      { quantity },
      CACHE_TTL.SHORT
    );
  },
  /**
   * Delete cached inventory for product
   * @param productId - Shopify product ID
   * @returns True if deleted successfully
   */
  async deleteInventory(productId: string) {
    return deleteCached(CACHE_KEYS.PRODUCT_INVENTORY(productId));
  },
};

/**
 * Search cache operations
 */
export const searchCache = {
  /**
   * Get cached search results (30 minute TTL)
   * @param query - Search query string
   * @returns Cached search results array or null if not found
   */
  async getResults(query: string) {
    return getCached(CACHE_KEYS.SEARCH_RESULTS(query));
  },
  /**
   * Cache search results with 30 minute TTL
   * @param query - Search query string
   * @param results - Array of search result objects
   * @returns True if set successfully
   */
  async setResults(query: string, results: any[]) {
    return setCached(
      CACHE_KEYS.SEARCH_RESULTS(query),
      results,
      CACHE_TTL.MEDIUM
    );
  },
  /**
   * Invalidate all cached search results
   * @returns Number of cache keys deleted
   */
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
 * User/Referral cache operations
 */
export const userCache = {
  /**
   * Get cached referral stats for user (1 hour TTL)
   * @param userId - User ID from Supabase auth
   * @returns Cached referral stats object or null if not found
   */
  async get(userId: string) {
    return getCached(CACHE_KEYS.REFERRAL_STATS(userId));
  },
  /**
   * Cache referral stats for user with 1 hour TTL
   * @param userId - User ID from Supabase auth
   * @param data - Referral stats object to cache
   * @returns True if set successfully
   */
  async set(userId: string, data: any) {
    return setCached(CACHE_KEYS.REFERRAL_STATS(userId), data, CACHE_TTL.LONG);
  },
  /**
   * Delete cached referral stats for user
   * @param userId - User ID from Supabase auth
   * @returns True if deleted successfully
   */
  async delete(userId: string) {
    return deleteCached(CACHE_KEYS.REFERRAL_STATS(userId));
  },
};

/**
 * Referral cache operations (alias for userCache)
 */
export const referralCache = userCache;

/**
 * Convenience functions for common cache operations
 */

/**
 * Get cached product (convenience wrapper)
 * @param productId - Shopify product ID
 * @returns Cached product object or null if not found
 */
export async function getCachedProduct(productId: string) {
  return productCache.get(productId);
}

/**
 * Cache product (convenience wrapper)
 * @param productId - Shopify product ID
 * @param data - Product object to cache
 * @returns True if set successfully
 */
export async function setCachedProduct(productId: string, data: any) {
  return productCache.set(productId, data);
}

/**
 * Get cached product inventory (convenience wrapper)
 * @param productId - Shopify product ID
 * @returns Cached inventory object or null if not found
 */
export async function getCachedInventory(productId: string) {
  return productCache.getInventory(productId);
}

/**
 * Cache product inventory (convenience wrapper)
 * @param productId - Shopify product ID
 * @param quantity - Stock quantity to cache
 * @returns True if set successfully
 */
export async function setCachedInventory(productId: string, quantity: number) {
  return productCache.setInventory(productId, quantity);
}

/**
 * Invalidate cached product data by ID
 * @param productId - Shopify product ID to invalidate
 * @returns True if successfully deleted
 */
export async function invalidateProductCache(productId: string): Promise<boolean> {
  return productCache.delete(productId);
}

/**
 * Invalidate cached product inventory by ID
 * @param productId - Shopify product ID to invalidate
 * @returns True if successfully deleted
 */
export async function invalidateProductInventory(
  productId: string
): Promise<boolean> {
  return productCache.deleteInventory(productId);
}

/**
 * Delete all cache keys matching a Redis glob pattern
 * @param pattern - Redis glob pattern (e.g., 'product:*' or 'search:*')
 * @returns Number of cache keys deleted
 */
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
