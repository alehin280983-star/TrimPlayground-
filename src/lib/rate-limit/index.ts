import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { TierType, RateLimitResult } from '@/types';

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Free tier: 5 requests per day
const freeTierLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
        parseInt(process.env.MAX_FREE_REQUESTS_PER_DAY || '5'),
        '1 d'
    ),
    prefix: 'ratelimit:free',
    analytics: true,
});

// Paid tier: 100 requests per day
const paidTierLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
        parseInt(process.env.MAX_PAID_REQUESTS_PER_DAY || '100'),
        '1 d'
    ),
    prefix: 'ratelimit:paid',
    analytics: true,
});

// IP-based rate limiting (protection against abuse)
const ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 requests per hour per IP
    prefix: 'ratelimit:ip',
});

/**
 * Check rate limit for a user based on their tier
 */
export async function checkRateLimit(
    userId: string,
    tier: TierType
): Promise<RateLimitResult> {
    const limiter = tier === 'pro' ? paidTierLimiter : freeTierLimiter;
    const result = await limiter.limit(userId);

    return {
        success: result.success,
        remaining: result.remaining,
        limit: result.limit,
        resetAt: new Date(result.reset),
    };
}

/**
 * Check IP-based rate limit
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
    const result = await ipLimiter.limit(ip);

    return {
        success: result.success,
        remaining: result.remaining,
        limit: result.limit,
        resetAt: new Date(result.reset),
    };
}

/**
 * Get remaining requests for a user
 */
export async function getRemainingRequests(
    userId: string,
    tier: TierType
): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    const limiter = tier === 'pro' ? paidTierLimiter : freeTierLimiter;
    const result = await limiter.getRemaining(userId);

    return {
        remaining: result.remaining,
        limit: result.limit,
        resetAt: new Date(result.reset),
    };
}

/**
 * Block a key for a specific duration (for abuse prevention)
 */
export async function blockKey(key: string, durationMs: number): Promise<void> {
    const blockLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(0, `${durationMs} ms`),
        prefix: 'ratelimit:blocked',
    });
    await blockLimiter.limit(key);
}

/**
 * Check if a key is blocked
 */
export async function isBlocked(key: string): Promise<boolean> {
    const blockLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(0, '1 d'),
        prefix: 'ratelimit:blocked',
    });
    const result = await blockLimiter.getRemaining(key);
    return result.remaining <= 0;
}

export { redis };
