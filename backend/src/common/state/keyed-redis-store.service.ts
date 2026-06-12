import { Logger } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';

/**
 * A typed, Redis-backed replacement for `new Map<string, T>()` held inside a
 * singleton service.
 *
 * Why: A NestJS provider is a single instance per node. Map-based state
 * cannot survive `pm2 restart`, doesn't share between horizontally-scaled
 * nodes, and creates split-brain bugs the moment we add a second worker.
 *
 * Instantiate one per consumer, passing a unique namespace string.
 */
export class KeyedRedisStoreService<T> {
  private readonly logger = new Logger(KeyedRedisStoreService.name);

  constructor(
    private readonly cache: RedisCacheService,
    private readonly namespace: string,
    private readonly ttlSeconds: number,
  ) {}

  private fullKey(key: string): string {
    return `state:${this.namespace}:${key}`;
  }

  async get(key: string): Promise<T | null> {
    return this.cache.get<T>(this.fullKey(key));
  }

  async set(key: string, value: T): Promise<void> {
    await this.cache.set(this.fullKey(key), value, this.ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.cache.del(this.fullKey(key));
  }

  async clear(): Promise<void> {
    await this.cache.delByPrefix(`state:${this.namespace}:`);
  }
}
