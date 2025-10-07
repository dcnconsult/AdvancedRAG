/**
 * @fileoverview Rate Limiting Service for Supabase Edge Functions.
 *
 * This service provides a flexible rate limiting solution to protect API
 * endpoints from abuse. It supports different limits for authenticated
 * and anonymous users.
 *
 * @note This is a simple in-memory implementation suitable for a single
 * Edge Function instance. For a distributed environment, this should be
 * replaced with a solution using a shared store like Redis or Supabase Realtime.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

interface RateLimiterConfig {
  authenticated: {
    limit: number;
    windowMs: number;
  };
  anonymous: {
    limit: number;
    windowMs: number;
  };
}

interface RequestRecord {
  count: number;
  startTime: number;
}

const defaultConfig: RateLimiterConfig = {
  authenticated: {
    limit: 100, // 100 requests
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  anonymous: {
    limit: 20, // 20 requests
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

// In-memory store for request tracking
const requestStore = new Map<string, RequestRecord>();

export class RateLimiter {
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Checks if a request from a given identifier is allowed.
   * @param userId - The user ID for authenticated users.
   * @param ip - The IP address for anonymous users.
   * @returns An object indicating if the request is allowed and providing rate limit headers.
   */
  check(userId?: string, ip?: string): { allowed: boolean; headers: Record<string, string> } {
    const isAuth = !!userId;
    const key = isAuth ? userId : ip || 'unknown_ip';
    const limits = isAuth ? this.config.authenticated : this.config.anonymous;

    const now = Date.now();
    let record = requestStore.get(key);

    if (!record || now - record.startTime > limits.windowMs) {
      // Start a new window
      record = { count: 1, startTime: now };
      requestStore.set(key, record);
    } else {
      record.count++;
    }
    
    const remaining = limits.limit - record.count;
    const resetTime = new Date(record.startTime + limits.windowMs).toISOString();

    const headers = {
      'X-RateLimit-Limit': String(limits.limit),
      'X-RateLimit-Remaining': String(Math.max(0, remaining)),
      'X-RateLimit-Reset': resetTime,
    };

    if (record.count > limits.limit) {
      return { allowed: false, headers };
    }

    return { allowed: true, headers };
  }
}
