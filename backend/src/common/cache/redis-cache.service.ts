import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly inMemory = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly redisClient: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');
    const password = this.configService.get<string>('REDIS_PASSWORD');

    if (host && port) {
      this.redisClient = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        retryStrategy: (times: number) =>
          times < 3 ? Math.min(times * 500, 2000) : null,
      });
      void this.redisClient.connect().catch(() => {
        this.logger.warn(
          'Redis connection failed, fallback to in-memory cache',
        );
      });
      return;
    }

    this.redisClient = null;
    this.logger.warn('Redis config missing, fallback to in-memory cache');
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisClient) {
      if (this.redisClient.status === 'ready') {
        try {
          const value = await this.redisClient.get(key);
          if (!value) {
            return null;
          }
          return JSON.parse(value) as T;
        } catch (error) {
          this.logger.warn(
            `Redis get failed for key ${key}, falling back to in-memory`,
            error,
          );
        }
      } else {
        this.logger.warn(
          `Redis not ready (status: ${this.redisClient.status}) for key ${key}, falling back to in-memory`,
        );
      }
    }

    const inMemoryValue = this.inMemory.get(key);
    if (!inMemoryValue) {
      return null;
    }
    if (Date.now() > inMemoryValue.expiresAt) {
      this.inMemory.delete(key);
      return null;
    }
    return JSON.parse(inMemoryValue.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.redisClient) {
      if (this.redisClient.status === 'ready') {
        try {
          const serialized = JSON.stringify(value);
          await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
          return;
        } catch (error) {
          this.logger.warn(
            `Redis set failed for key ${key} (possible circular reference), falling back to in-memory`,
            error,
          );
        }
      } else {
        this.logger.warn(
          `Redis not ready (status: ${this.redisClient.status}) for key ${key}, falling back to in-memory`,
        );
      }
    }

    try {
      const serialized = JSON.stringify(value);
      this.inMemory.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    } catch (error) {
      this.logger.error(
        `Cache set failed because value for key ${key} cannot be serialized to JSON`,
        error,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (this.redisClient) {
      if (this.redisClient.status === 'ready') {
        try {
          await this.redisClient.del(key);
          return;
        } catch (error) {
          this.logger.warn(
            `Redis del failed for key ${key}, falling back to in-memory`,
            error,
          );
        }
      } else {
        this.logger.warn(
          `Redis not ready (status: ${this.redisClient.status}) for key ${key}, falling back to in-memory`,
        );
      }
    }
    this.inMemory.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.redisClient) {
      if (this.redisClient.status === 'ready') {
        try {
          const stream = this.redisClient.scanStream({
            match: `${prefix}*`,
            count: 100,
          });

          for await (const keys of stream) {
            const matchedKeys = keys as string[];
            if (matchedKeys.length > 0) {
              await this.redisClient.del(...matchedKeys);
            }
          }
          return;
        } catch (error) {
          this.logger.warn(
            `Redis delByPrefix failed for prefix ${prefix}, falling back to in-memory`,
            error,
          );
        }
      } else {
        this.logger.warn(
          `Redis not ready (status: ${this.redisClient.status}) for prefix ${prefix}, falling back to in-memory`,
        );
      }
    }

    for (const key of this.inMemory.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemory.delete(key);
      }
    }
  }

  async ping(): Promise<number> {
    if (!this.redisClient || this.redisClient.status !== 'ready') {
      throw new Error('Redis client not ready');
    }
    const start = Date.now();
    await this.redisClient.ping();
    return Date.now() - start;
  }

  async getMemoryUsage(): Promise<{ usedMb: number; maxMb: number }> {
    if (!this.redisClient || this.redisClient.status !== 'ready') {
      return { usedMb: 0, maxMb: 0 };
    }
    const info = await this.redisClient.info('memory');
    const usedMatch = info.match(/used_memory:(\d+)/);
    const maxMatch = info.match(/maxmemory:(\d+)/);

    return {
      usedMb: usedMatch ? Math.round(parseInt(usedMatch[1]) / 1024 / 1024) : 0,
      maxMb: maxMatch ? Math.round(parseInt(maxMatch[1]) / 1024 / 1024) : 0,
    };
  }

  getStatus(): string {
    return this.redisClient?.status || 'not_configured';
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
