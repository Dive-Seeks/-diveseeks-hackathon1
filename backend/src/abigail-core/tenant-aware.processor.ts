import { ClsService } from 'nestjs-cls';
import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TenantJobPayload } from './tenant-job.service';

export type { TenantJobPayload };

export abstract class TenantAwareProcessor extends WorkerHost {
  constructor(protected readonly cls: ClsService) {
    super();
  }

  // Do NOT override this in subclasses — override handleJob() instead
  async process(job: Job<TenantJobPayload>, token?: string): Promise<unknown> {
    return this.cls.run(async () => {
      this.cls.set('tenantId', job.data?.tenantId ?? null);
      this.cls.set('userId', job.data?.userId ?? null);
      return this.handleJob(job, token);
    });
  }

  abstract handleJob(job: Job, token?: string): Promise<unknown>;
}
