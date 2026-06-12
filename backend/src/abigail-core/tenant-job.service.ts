import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Queue, JobsOptions, Job } from 'bullmq';

export interface TenantJobPayload {
  tenantId: string | null;
  userId: string | null;
}

@Injectable()
export class TenantJobService {
  constructor(private readonly cls: ClsService) {}

  async enqueue<T extends Omit<Record<string, unknown>, 'tenantId' | 'userId'>>(
    queue: Queue,
    jobName: string,
    payload: T,
    opts?: JobsOptions,
  ): Promise<Job<T & TenantJobPayload>> {
    const tenantId = this.cls.get('tenantId') ?? null;
    const userId = this.cls.get('userId') ?? null;
    return queue.add(
      jobName,
      { ...payload, tenantId, userId },
      opts,
    ) as Promise<Job<T & TenantJobPayload>>;
  }

  async runForTenant<T>(
    tenantId: string | null,
    userId: string | null,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.cls.run(async () => {
      this.cls.set('tenantId', tenantId);
      this.cls.set('userId', userId);
      return fn();
    });
  }
}
