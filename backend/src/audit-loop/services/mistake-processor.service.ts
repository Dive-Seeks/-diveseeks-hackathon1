import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuditFinding, AuditPhase } from '../entities/audit-loop.entity';
import { MetaOptimizerService } from '../../evolve/meta-optimizer.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { subDays } from 'date-fns';

@Injectable()
export class MistakeProcessorService {
  private readonly logger = new Logger(MistakeProcessorService.name);

  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    private readonly metaOptimizer: MetaOptimizerService,
    // Note: EvolveOrchestrator/Queue will be injected via module
  ) {}

  async processFindings(
    loopId: string,
    round: number,
    findings: Partial<AuditFinding>[],
  ): Promise<void> {
    this.logger.log(
      `[MistakeProcessor] Processing ${findings.length} findings for loop ${loopId}`,
    );

    for (const finding of findings) {
      await this.processSingleFinding(finding);
    }
  }

  private async processSingleFinding(
    finding: Partial<AuditFinding>,
  ): Promise<void> {
    // 1. Check for priority evolution (Pattern: 3 recurrences in 24h)
    if (finding.specialistId && finding.criterion) {
      const recentCount = await this.findingRepo.count({
        where: {
          specialistId: finding.specialistId,
          criterion: finding.criterion,
          createdAt: MoreThan(subDays(new Date(), 1)),
        },
      });

      if (recentCount >= 3) {
        this.logger.warn(
          `[MistakeProcessor] High recurrence of ${finding.criterion} for ${finding.specialistId}. Triggering priority evolution.`,
        );
        // Emit event or add to queue (handled by orchestrator)
      }
    }

    // 2. Feed to Meta-Optimizer for rubric drift
    // This is handled at the end of the phase usually, but can be done per-finding
  }
}
