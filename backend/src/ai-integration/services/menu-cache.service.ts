import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Response } from 'express';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

export interface CachedMenuData {
  content: string;
  metadata: {
    tokens_used: number;
    response_time_ms: number;
    generated_at: string;
  };
}

export interface MenuGenerationRequest {
  businessType: string;
  keywords: string[];
  dietaryNeeds?: string[];
}

@Injectable()
export class MenuCacheService {
  constructor(private readonly redisCache: RedisCacheService) {}

  /**
   * Get cached AI-generated menu from Redis
   * Returns null if not found
   */
  async getCachedMenu(
    tenantId: string,
    cacheKey: string,
  ): Promise<CachedMenuData | null> {
    const key = `menu_gen:${tenantId}:${cacheKey}`;
    return this.redisCache.get<CachedMenuData>(key);
  }

  /**
   * Save AI-generated menu to Redis cache
   * TTL: 1 hour (3600 seconds) - enough for onboarding session
   */
  async saveCachedMenu(
    tenantId: string,
    cacheKey: string,
    content: string,
    metadata: {
      tokens_used: number;
      response_time_ms: number;
    },
  ): Promise<void> {
    const key = `menu_gen:${tenantId}:${cacheKey}`;
    const data: CachedMenuData = {
      content,
      metadata: {
        ...metadata,
        generated_at: new Date().toISOString(),
      },
    };

    await this.redisCache.set(key, data, 3600);
    console.log(
      `[Menu Cache] 💾 Saved to cache (key: ${cacheKey.slice(0, 8)}...)`,
    );
  }

  /**
   * Generate deterministic cache key from request parameters
   * Same parameters = same key = cache hit
   */
  generateCacheKey(request: MenuGenerationRequest): string {
    const payload = JSON.stringify({
      type: request.businessType,
      keywords: request.keywords.sort(), // Sort for consistency
      dietary: (request.dietaryNeeds || []).sort(),
    });

    return crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Simulate streaming response from cached content
   * Provides same UX as real AI streaming
   */
  async simulateStream(cachedResponse: string, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Split into words for realistic streaming
    const words = cachedResponse.split(' ');
    const chunkSize = 3; // Stream 3 words at a time

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);

      // Small delay to simulate AI generation (20ms per chunk)
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  /**
   * Clear cached menu for a tenant (useful for testing or user-requested refresh)
   */
  async clearCache(tenantId: string, cacheKey?: string): Promise<void> {
    if (cacheKey) {
      const key = `menu_gen:${tenantId}:${cacheKey}`;
      await this.redisCache.del(key);
      console.log(`[Menu Cache] 🗑️  Cleared cache for key: ${cacheKey}`);
    } else {
      // Clear all menu generation caches for this tenant
      const prefix = `menu_gen:${tenantId}:`;
      await this.redisCache.delByPrefix(prefix);
      console.log(
        `[Menu Cache] 🗑️  Cleared all caches for tenant: ${tenantId}`,
      );
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(tenantId: string): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }
}
