import { LRUCache } from 'lru-cache';
import { headers } from 'next/headers';

// Rate Limiter configuration options
export interface RateLimiterOptions {
  limit: number;      // Max number of requests allowed in the window
  windowMs: number;   // Window size in milliseconds
}

export class RateLimiter {
  private cache: LRUCache<string, number>;
  private limit: number;

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.cache = new LRUCache<string, number>({
      max: 1000,
      ttl: options.windowMs,
    });
  }

  /**
   * Checks if the request under a specific key is within the rate limits.
   * Increments the count if allowed.
   */
  public check(key: string): { success: boolean; limit: number; remaining: number } {
    const currentCount = this.cache.get(key) || 0;
    
    if (currentCount >= this.limit) {
      return { success: false, limit: this.limit, remaining: 0 };
    }
    
    const nextCount = currentCount + 1;
    this.cache.set(key, nextCount);
    
    return { success: true, limit: this.limit, remaining: this.limit - nextCount };
  }
}

// Global short-term IP rate limiter for expensive AI actions: max 10 requests per minute
export const ipRateLimiter = new RateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

// Global short-term User UID rate limiter for expensive AI actions: max 10 requests per minute
export const userRateLimiter = new RateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Resolves the client IP address from headers in a Next.js Server Action/Route.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      // Return the first IP in the forwarded-for list (original client IP)
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  } catch (error) {
    console.warn('[getClientIp] Failed to read headers for IP resolution:', error);
  }
  return '127.0.0.1';
}
