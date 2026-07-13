import { checkRateLimit } from './cache';

const RATE_LIMIT_CONFIG = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  search: { windowMs: 1 * 60 * 1000, maxRequests: 30 },
  checkout: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
};

export function getRateLimitConfig(endpoint: string) {
  if (endpoint.includes('auth')) return RATE_LIMIT_CONFIG.auth;
  if (endpoint.includes('search')) return RATE_LIMIT_CONFIG.search;
  if (endpoint.includes('checkout') || endpoint.includes('orders')) return RATE_LIMIT_CONFIG.checkout;
  return RATE_LIMIT_CONFIG.api;
}

export async function checkEndpointRateLimit(
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const config = getRateLimitConfig(endpoint);
  return checkRateLimit(
    `${endpoint}:${identifier}`,
    config.maxRequests,
    config.windowMs
  );
}

export function getIdentifier(headers: Headers, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

export default {
  getRateLimitConfig,
  checkEndpointRateLimit,
  getIdentifier,
};
