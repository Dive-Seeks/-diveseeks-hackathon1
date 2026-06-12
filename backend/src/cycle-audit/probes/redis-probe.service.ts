import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Injectable()
export class RedisProbeService {
  constructor(private readonly redisCache: RedisCacheService) {}

  async run(): Promise<{
    ok: boolean;
    latencyMs: number;
    memoryUsedMb: number;
    alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }>;
  }> {
    const start = Date.now();
    try {
      const latencyMs = await this.redisCache.ping();
      const memory = await this.redisCache.getMemoryUsage();

      const alerts: Array<{
        probe: string;
        severity: 'critical' | 'degraded';
        message: string;
      }> = [];
      if (latencyMs > 50) {
        alerts.push({
          probe: 'redis',
          severity: 'degraded',
          message: `High latency: ${latencyMs}ms`,
        });
      }

      // If maxmemory is set, check percentage
      if (memory.maxMb > 0) {
        const usagePercent = (memory.usedMb / memory.maxMb) * 100;
        if (usagePercent > 80) {
          alerts.push({
            probe: 'redis',
            severity: 'degraded',
            message: `High memory usage: ${usagePercent.toFixed(1)}% (${memory.usedMb}MB / ${memory.maxMb}MB)`,
          });
        }
      }

      return {
        ok: true,
        latencyMs,
        memoryUsedMb: memory.usedMb,
        alerts,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        memoryUsedMb: 0,
        alerts: [
          {
            probe: 'redis',
            severity: 'critical' as const,
            message: `Redis check failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
