import { Collection } from "discord.js";
import { logger } from "#settings";

interface RateLimitData {
    count: number;
    resetTime: number;
}

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    skipSuccessfulRequests?: boolean;
}

class RateLimiter {
    private limits = new Collection<string, RateLimitData>();
    private configs = new Map<string, RateLimitConfig>();

    /**
     * Register a rate limit configuration
     */
    registerLimit(key: string, config: RateLimitConfig): void {
        this.configs.set(key, config);
    }

    /**
     * Check if a request should be rate limited
     */
    checkLimit(identifier: string, limitKey: string): { allowed: boolean; resetTime?: number; remaining?: number } {
        const config = this.configs.get(limitKey);
        if (!config) {
            logger.warn(`Rate limit config not found for key: ${limitKey}`);
            return { allowed: true };
        }

        const now = Date.now();
        const key = `${limitKey}:${identifier}`;
        const current = this.limits.get(key);

        // If no previous data or window has expired, reset
        if (!current || now >= current.resetTime) {
            this.limits.set(key, {
                count: 1,
                resetTime: now + config.windowMs
            });
            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetTime: now + config.windowMs
            };
        }

        // Check if limit exceeded
        if (current.count >= config.maxRequests) {
            return {
                allowed: false,
                resetTime: current.resetTime,
                remaining: 0
            };
        }

        // Increment counter
        current.count++;
        this.limits.set(key, current);

        return {
            allowed: true,
            remaining: config.maxRequests - current.count,
            resetTime: current.resetTime
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, data] of this.limits.entries()) {
            if (now >= data.resetTime) {
                this.limits.delete(key);
            }
        }
    }

    /**
     * Get current usage for an identifier
     */
    getUsage(identifier: string, limitKey: string): { count: number; resetTime: number } | null {
        const key = `${limitKey}:${identifier}`;
        return this.limits.get(key) || null;
    }
}



// Add method to start cleanup interval
class RateLimiterWithCleanup extends RateLimiter {
    private cleanupInterval: NodeJS.Timeout | null = null;
    
    startCleanupInterval(intervalMs: number = 5 * 60 * 1000): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, intervalMs);
    }
    
    stopCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Create singleton instance with cleanup capability
export const rateLimiter = new RateLimiterWithCleanup();

// Register default rate limits
rateLimiter.registerLimit('command', {
    maxRequests: 10,
    windowMs: 60000 // 1 minute
});

rateLimiter.registerLimit('api', {
    maxRequests: 30,
    windowMs: 60000 // 1 minute
});

rateLimiter.registerLimit('strict', {
    maxRequests: 3,
    windowMs: 60000 // 1 minute
});