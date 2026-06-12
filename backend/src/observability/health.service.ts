import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly queueNames = [
    'brain-loop',
    'task-manager',
    'api-fusion',
    'audit-loop',
    'data-engine',
    'workflow-engine',
    'knowledge-synthesis',
    'geo-refinement',
    'route-refinement',
    'brain-memory',
    'email_queue',
    'menu-image-generation',
    'night-team',
    'wakeup-queue',
  ];

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisCache: RedisCacheService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async getHealth() {
    const checkedAt = new Date().toISOString();

    const [dbHealth, redisHealth, queueHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueues(),
    ]);

    const llmHealth = this.checkLlmKeys();

    const subsystems = [
      dbHealth.connected,
      redisHealth.connected,
      ...Object.values(queueHealth).map((q) => q !== null),
    ];

    let status = 'ok';
    if (subsystems.some((s) => s === false)) {
      status = 'down';
    } else if (Object.values(llmHealth).some((v) => v === 'missing')) {
      status = 'degraded';
    }

    return {
      status,
      checkedAt,
      database: dbHealth,
      redis: redisHealth,
      queues: queueHealth,
      llm: llmHealth,
    };
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      const connected = this.dataSource.isInitialized;
      if (connected) {
        await this.dataSource.query('SELECT 1');
      }
      return {
        connected,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkRedis() {
    const start = Date.now();
    try {
      const latencyMs = await this.redisCache.ping();
      const memory = await this.redisCache.getMemoryUsage();
      return {
        connected: true,
        latencyMs,
        memoryUsedMb: memory.usedMb,
      };
    } catch (error) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkQueues() {
    const results: Record<string, any> = {};

    await Promise.all(
      this.queueNames.map(async (name) => {
        try {
          const queue = this.moduleRef.get<Queue>(getQueueToken(name), {
            strict: false,
          });
          if (queue) {
            const counts = await queue.getJobCounts(
              'waiting',
              'active',
              'failed',
            );
            results[name] = counts;
          } else {
            results[name] = null;
          }
        } catch (_error) {
          results[name] = null;
        }
      }),
    );

    return results;
  }

  private checkLlmKeys() {
    return {
      deepseek: process.env.DEEPSEEK_API_KEY ? 'ok' : 'missing',
      gemini: process.env.GOOGLE_AI_API_KEY ? 'ok' : 'missing',
      google_ide: process.env.GOOGLE_AI_API_KEY ? 'ok' : 'missing',
      openai: process.env.OPENAI_API_KEY ? 'ok' : 'missing',
      openrouter: process.env.OPENROUTER_API_KEY ? 'ok' : 'missing',
    };
  }
}
