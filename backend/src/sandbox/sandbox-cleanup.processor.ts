import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SandboxRecord } from './entities/sandbox-record.entity';
import { SandboxService } from './sandbox.service';

@Processor('sandbox-cleanup')
export class SandboxCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(SandboxCleanupProcessor.name);

  constructor(
    @InjectRepository(SandboxRecord)
    private readonly repo: Repository<SandboxRecord>,
    private readonly sandboxService: SandboxService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const stale = await this.repo.find({
      where: { status: In(['creating', 'ready']) },
    });

    for (const record of stale) {
      // If sandbox has been in creating/ready for > 30 min, destroy it
      const ageMin =
        (Date.now() - new Date(record.createdAt).getTime()) / 60000;
      if (ageMin > 30) {
        this.logger.warn(
          `Orphaned sandbox ${record.taskSessionId} (age: ${Math.round(ageMin)}min) — destroying`,
        );
        await this.sandboxService.destroy(record.taskSessionId);
      }
    }
  }
}
