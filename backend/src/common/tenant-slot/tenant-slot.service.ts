import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const MAX_ACTIVE_TASKS_PER_TENANT = 1;
const SLOT_TTL_SECONDS = 300; // safety valve: auto-release after 5 min if process dies

/**
 * Per-tenant task slot semaphore using Redis INCR/DECR with TTL.
 * Guarantees at most MAX_ACTIVE_TASKS_PER_TENANT concurrent agent pipelines
 * per tenant, preventing one tenant from monopolizing LLM resources.
 *
 * Falls back to allow-all when Redis is unavailable so the system degrades
 * gracefully rather than refusing all work.
 */
@Injectable()
export class TenantSlotService {
  private readonly logger = new Logger(TenantSlotService.name);
  private readonly redis: Redis | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST');
    const port = this.config.get<number>('REDIS_PORT');
    const password = this.config.get<string>('REDIS_PASSWORD');

    if (host && port) {
      this.redis = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      void this.redis.connect().catch(() => {
        this.logger.warn(
          '[TenantSlot] Redis unavailable — slot control disabled',
        );
      });
    } else {
      this.redis = null;
    }
  }

  /** Returns true if slot acquired, false if tenant is at capacity. */
  async tryAcquire(tenantId: string): Promise<boolean> {
    if (!this.redis || this.redis.status !== 'ready') return true; // graceful degradation

    const key = `slot:tenant:${tenantId}`;
    // Atomic: INCR then check — if over limit, immediately DECR and reject
    const val = await this.redis.incr(key);
    // Set TTL on first acquisition to prevent permanent lock if process crashes
    if (val === 1) {
      await this.redis.expire(key, SLOT_TTL_SECONDS);
    }

    if (val > MAX_ACTIVE_TASKS_PER_TENANT) {
      await this.redis.decr(key);
      this.logger.warn(
        `[TenantSlot] Tenant ${tenantId} at capacity (active=${val - 1})`,
      );
      return false;
    }

    this.logger.log(
      `[TenantSlot] Acquired slot for tenant ${tenantId} (active=${val})`,
    );
    return true;
  }

  /** Must be called on task completion or failure — always. */
  async release(tenantId: string): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') return;

    const key = `slot:tenant:${tenantId}`;
    const val = await this.redis.decr(key);
    // Guard against going below 0 from double-release
    if (val < 0) await this.redis.set(key, 0);
    this.logger.log(
      `[TenantSlot] Released slot for tenant ${tenantId} (active=${Math.max(0, val)})`,
    );
  }

  /** Returns current active task count for a tenant (for status endpoints). */
  async getActiveCount(tenantId: string): Promise<number> {
    if (!this.redis || this.redis.status !== 'ready') return 0;
    const val = await this.redis.get(`slot:tenant:${tenantId}`);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Acquire the per-project run lock. Stores `runId` as the value so the owner can
   * later renew/release it safely. Returns true if acquired (or redis unavailable).
   */
  async tryLockProject(
    projectId: string,
    ttlSeconds = 300,
    runId = '1',
  ): Promise<boolean> {
    if (!this.redis || this.redis.status !== 'ready') return true;
    const lockKey = `canvas-run:lock:${projectId}`;
    try {
      const acquired = await this.redis.set(
        lockKey,
        runId,
        'EX',
        ttlSeconds,
        'NX',
      );
      return acquired === 'OK';
    } catch {
      this.logger.warn(
        `[TenantSlot] Project lock unavailable — allowing run (projectId=${projectId})`,
      );
      return true;
    }
  }

  /** Extend the lock TTL only if this run still owns it. Returns false if not owner / redis down. */
  async renewProjectLock(
    projectId: string,
    runId: string,
    ttlSeconds = 300,
  ): Promise<boolean> {
    if (!this.redis || this.redis.status !== 'ready') return false;
    const lockKey = `canvas-run:lock:${projectId}`;
    const script =
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end";
    try {
      const res = await this.redis.eval(
        script,
        1,
        lockKey,
        runId,
        String(ttlSeconds),
      );
      return res === 1;
    } catch {
      return false;
    }
  }

  /** Release the lock only if this run owns it (prevents deleting a newer run's lock). */
  async unlockProjectIfOwner(projectId: string, runId: string): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') return;
    const lockKey = `canvas-run:lock:${projectId}`;
    const script =
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
    try {
      await this.redis.eval(script, 1, lockKey, runId);
    } catch {
      this.logger.warn(
        `[TenantSlot] Owner-unlock failed (projectId=${projectId})`,
      );
    }
  }

  /** Read the current lock value (the active runId), or null. */
  async getProjectLockValue(projectId: string): Promise<string | null> {
    if (!this.redis || this.redis.status !== 'ready') return null;
    try {
      return await this.redis.get(`canvas-run:lock:${projectId}`);
    } catch {
      return null;
    }
  }

  async unlockProject(projectId: string): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') return;

    const lockKey = `canvas-run:lock:${projectId}`;
    try {
      await this.redis.del(lockKey);
    } catch (err) {
      this.logger.warn(
        `[TenantSlot] Failed to release project lock (projectId=${projectId})`,
      );
    }
  }

  async setHaltFlag(
    projectId: string,
    tenantId: string,
    reason: 'pause' | 'stop',
  ): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') return;
    const key = `canvas-stop:${tenantId}:${projectId}`;
    try {
      await this.redis.set(key, reason, 'EX', 600);
    } catch {
      this.logger.warn(
        `[TenantSlot] Failed to set halt flag (projectId=${projectId})`,
      );
    }
  }

  async readHaltFlag(
    projectId: string,
    tenantId: string,
  ): Promise<'pause' | 'stop' | null> {
    if (!this.redis || this.redis.status !== 'ready') return null;
    const key = `canvas-stop:${tenantId}:${projectId}`;
    try {
      const v = await this.redis.get(key);
      return v === 'pause' || v === 'stop' ? v : null;
    } catch {
      return null;
    }
  }

  async clearHaltFlag(projectId: string, tenantId: string): Promise<void> {
    if (!this.redis || this.redis.status !== 'ready') return;
    const key = `canvas-stop:${tenantId}:${projectId}`;
    try {
      await this.redis.del(key);
    } catch {
      this.logger.warn(
        `[TenantSlot] Failed to clear halt flag (projectId=${projectId})`,
      );
    }
  }

  /** Back-compat wrappers. Existing callers expect a boolean stop. */
  async setStopFlag(projectId: string, tenantId: string): Promise<void> {
    return this.setHaltFlag(projectId, tenantId, 'stop');
  }

  async checkStopFlag(projectId: string, tenantId: string): Promise<boolean> {
    return (await this.readHaltFlag(projectId, tenantId)) === 'stop';
  }

  async clearStopFlag(projectId: string, tenantId: string): Promise<void> {
    return this.clearHaltFlag(projectId, tenantId);
  }
}
