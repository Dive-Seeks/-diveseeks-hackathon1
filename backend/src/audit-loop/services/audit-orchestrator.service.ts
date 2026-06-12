import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLoop, AuditPhase } from '../entities/audit-loop.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AUDIT_LOOP_QUEUE, AuditJobs } from '../audit-loop.queue';

@Injectable()
export class AuditOrchestratorService {
  private readonly logger = new Logger(AuditOrchestratorService.name);

  constructor(
    @InjectRepository(AuditLoop)
    private readonly loopRepo: Repository<AuditLoop>,
    @InjectQueue(AUDIT_LOOP_QUEUE)
    private readonly auditQueue: Queue,
  ) {}

  async startLoop(
    request: string,
    tenantId?: string,
    userId?: string,
  ): Promise<AuditLoop> {
    try {
      const loop = await this.loopRepo.save(
        this.loopRepo.create({
          originatingRequest: request,
          tenantId,
          userId,
          currentPhase: AuditPhase.BRAINSTORM,
          currentRound: 1,
          status: 'running',
        }),
      );

      this.logger.log(
        `Starting audit loop ${loop.id} for request: "${request.substring(0, 50)}..."`,
      );

      await this.auditQueue.add(
        AuditJobs.RUN_PHASE,
        {
          loopId: loop.id,
          phase: AuditPhase.BRAINSTORM,
        },
        {
          removeOnComplete: true,
        },
      );

      return loop;
    } catch (error) {
      this.logger.error(
        `Failed to start audit loop: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
