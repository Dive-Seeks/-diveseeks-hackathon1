import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { EvolveOrchestrator } from './evolve-orchestrator.service';
import { MetaOptimizerService } from './meta-optimizer.service';
import { ACTIVE_SPECIALIST_IDS } from '../agents/constants/specialist-prompts';

/**
 * Evolve Processor — handles specialist evolution, meta-optimization, and parallel fan-out.
 * concurrency: 2 matches the Autodata architecture's `mb evolve` with 2 workers.
 */
@Processor('evolve', { concurrency: 2 })
export class EvolveProcessor extends WorkerHost {
  private readonly logger = new Logger(EvolveProcessor.name);

  constructor(
    private readonly orchestrator: EvolveOrchestrator,
    private readonly metaOptimizer: MetaOptimizerService,
    @InjectQueue('evolve')
    private readonly evolveQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing evolve job: ${job.name}`);

    if (job.name === 'evolve-specialist') {
      await this.orchestrator.runCycle(
        job.data.specialistId,
        job.data.tenantId,
      );
      return;
    }

    if (job.name === 'evolve-all') {
      // Priority tiers: top 10 daily, mid 10 weekly, bottom 10 monthly
      // We will slice ACTIVE_SPECIALIST_IDS into tiers
      const today = new Date();
      const isWeekend = today.getDay() === 0 || today.getDay() === 6;
      const isStartOfMonth = today.getDate() === 1;

      const specialistsToEvolve: string[] = [];

      // Tier 1: Top 10 (always run daily)
      specialistsToEvolve.push(...ACTIVE_SPECIALIST_IDS.slice(0, 10));

      // Tier 2: Mid 10 (run on weekends)
      if (isWeekend || isStartOfMonth) {
        specialistsToEvolve.push(...ACTIVE_SPECIALIST_IDS.slice(10, 20));
      }

      // Tier 3: Bottom 10 (run on 1st of month)
      if (isStartOfMonth) {
        specialistsToEvolve.push(...ACTIVE_SPECIALIST_IDS.slice(20, 30));
      }

      // Add a nightly time-budget so we don't blow through API limits
      // Limit to 5 tests max per nightly fan-out run
      const maxJobs = process.env.EVOLVE_NIGHTLY_BUDGET
        ? parseInt(process.env.EVOLVE_NIGHTLY_BUDGET)
        : 5;

      const tenantId = job.data?.tenantId || 'global';
      const jobs = specialistsToEvolve
        .slice(0, maxJobs)
        .map((specialistId) => ({
          name: 'evolve-specialist',
          data: { specialistId, tenantId },
          opts: { removeOnComplete: true, removeOnFail: 10 },
        }));

      await this.evolveQueue.addBulk(jobs);
      this.logger.log(
        `[Evolve] Fan-out: queued ${jobs.length} specialist evolution jobs (concurrency: 2, budget: ${maxJobs})`,
      );
      return;
    }

    if (job.name === 'meta-optimize') {
      try {
        await this.metaOptimizer.runMetaOptimizationForAllTenants();
      } catch (e) {
        this.logger.error(`Meta-optimization failed: ${(e as Error).message}`);
      }
      return;
    }
  }
}
