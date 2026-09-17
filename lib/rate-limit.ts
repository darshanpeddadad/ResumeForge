import { NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * In-memory sliding-window rate limiter.
 * Protects users from rapid depletion of their third-party BYOK API quotas
 * and prevents credential stuffing against the settings and model scanning routes.
 */
class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();

  /**
   * Evaluates whether an action is permitted within the sliding window.
   */
  public check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    resetMs: number;
  } {
    const now = Date.now();
    this.cleanupIfNeeded(now);

    const record = this.store.get(key) || { timestamps: [] };
    const windowStart = now - windowMs;

    // Filter timestamps within current sliding window
    const recentTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (recentTimestamps.length >= maxRequests) {
      const oldestInWindow = recentTimestamps[0];
      const resetMs = Math.max(0, oldestInWindow + windowMs - now);

      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetMs,
      };
    }

    recentTimestamps.push(now);
    this.store.set(key, { timestamps: recentTimestamps });

    return {
      success: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - recentTimestamps.length),
      resetMs: windowMs,
    };
  }

  private cleanupIfNeeded(now: number): void {
    // Run cleanup at most once every 60 seconds
    if (now - this.lastCleanup < 60000) return;
    this.lastCleanup = now;

    // Remove entries where all timestamps are older than 10 minutes
    const maxRetention = 600000;
    for (const [key, record] of this.store.entries()) {
      const valid = record.timestamps.filter((ts) => now - ts < maxRetention);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        record.timestamps = valid;
      }
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();

/**
 * AI generation rate limit: 20 requests per 60 seconds per user.
 */
export function checkAiGenerationRateLimit(userId: string) {
  return rateLimiter.check(`ai-gen:${userId}`, 20, 60000);
}

/**
 * Settings / key update rate limit: 10 requests per 60 seconds per user.
 */
export function checkSettingsRateLimit(userId: string) {
  return rateLimiter.check(`settings:${userId}`, 10, 60000);
}

/**
 * Standard HTTP 429 response helper with Retry-After header.
 */
export function rateLimitResponse(
  resetMs: number,
  message = "Rate limit reached. Please slow down to protect your AI quota."
): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil(resetMs / 1000));

  return NextResponse.json(
    {
      error: message,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
      },
    }
  );
}
