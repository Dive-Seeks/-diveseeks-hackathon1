import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DreamerService } from './dreamer.service';
import { UserChatMessage } from '../chat/entities/user-chat-message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface DreamJobData {
  tenantId: string;
  userId?: string; // if absent, process all users in this tenant
}

@Processor('dreamer')
export class DreamerProcessor extends WorkerHost {
  private readonly logger = new Logger(DreamerProcessor.name);

  constructor(
    private readonly dreamerService: DreamerService,
    @InjectRepository(UserChatMessage)
    private readonly chatRepo: Repository<UserChatMessage>,
  ) {
    super();
  }

  async process(job: Job<DreamJobData>): Promise<void> {
    const { tenantId, userId } = job.data;
    this.logger.log(
      `[DreamerProcessor] job=${job.id} tenant=${tenantId} userId=${userId ?? 'all'}`,
    );

    if (userId) {
      await this.dreamerService.dream(tenantId, userId);
      return;
    }

    // Fan out to all distinct users who have undreamed turns in this tenant
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.chatRepo
      .createQueryBuilder('m')
      .select('DISTINCT m."userId"', 'userId')
      .where(
        'm."tenantId" = :tenantId AND m."dreamedAt" IS NULL AND m."createdAt" >= :since',
        { tenantId, since },
      )
      .getRawMany<{ userId: string }>();

    for (const { userId: uid } of result) {
      await this.dreamerService
        .dream(tenantId, uid)
        .catch((err) =>
          this.logger.error(
            `[DreamerProcessor] dream failed for user ${uid}: ${(err as Error).message}`,
          ),
        );
    }
  }
}
