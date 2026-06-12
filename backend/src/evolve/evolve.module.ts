import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SpecialistPromptVersion } from './entities/specialist-prompt-version.entity';
import { EvolveCycle } from './entities/evolve-cycle.entity';
import { TaskTrajectory } from './entities/task-trajectory.entity';
import { HarnessCandidate } from './entities/harness-candidate.entity';
import { SpecialistModelOverride } from './entities/specialist-model-override.entity';
import { DegradedOutput } from './entities/degraded-output.entity';
import { Agent } from '../agents/entities/agent.entity';
import { EvalHarnessService } from './eval-harness.service';
import { EvolveAnalyzerService } from './evolve-analyzer.service';
import { EvolveImplementService } from './evolve-implement.service';
import { EvolveOrchestrator } from './evolve-orchestrator.service';
import { MetaOptimizerService } from './meta-optimizer.service';
import { EvolveProcessor } from './evolve.processor';
import { PromptVersionService } from './prompt-version.service';
import { SpecialistModelRouterService } from './specialist-model-router.service';
import { DegradedReasoningService } from './degraded-reasoning.service';
import { TrajectoryWriterService } from './trajectory-writer.service';
import { EvolveController } from './evolve.controller';
import { CacheModule } from '../common/cache/cache.module';
import { HermesModule } from '../hermes/hermes.module';
import { TokenizerModule } from '../tokenizer/tokenizer.module';

import { shouldRunAiProcessors } from '../common/ai-worker-mode';

const processors = shouldRunAiProcessors() ? [EvolveProcessor] : [];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpecialistPromptVersion,
      EvolveCycle,
      HarnessCandidate,
      SpecialistModelOverride,
      DegradedOutput,
      Agent,
      TaskTrajectory,
    ]),
    BullModule.registerQueue({ name: 'evolve' }),
    CacheModule,
    HermesModule,
    TokenizerModule,
  ],
  controllers: [EvolveController],
  providers: [
    EvalHarnessService,
    EvolveAnalyzerService,
    EvolveImplementService,
    EvolveOrchestrator,
    MetaOptimizerService,
    PromptVersionService,
    SpecialistModelRouterService,
    DegradedReasoningService,
    TrajectoryWriterService,
    ...processors,
  ],
  exports: [
    PromptVersionService,
    MetaOptimizerService,
    SpecialistModelRouterService,
    DegradedReasoningService,
    TrajectoryWriterService,
  ],
})
export class EvolveModule implements OnModuleInit {
  constructor(
    @InjectQueue('evolve') private readonly evolveQueue: Queue,
    private readonly promptVersionService: PromptVersionService,
  ) {}

  async onModuleInit() {
    // Seed v1 prompt versions idempotently on every boot
    await this.promptVersionService.seedV1PromptVersions();

    // Nightly cron: 4 AM — evolve specialist prompts
    await this.evolveQueue.add(
      'evolve-all',
      {},
      {
        repeat: { pattern: '0 4 * * *' },
        removeOnComplete: true,
      },
    );

    // Weekly cron: Sunday 3 AM — meta-optimize the harness itself
    await this.evolveQueue.add(
      'meta-optimize',
      {},
      {
        repeat: { pattern: '0 3 * * 0' },
        removeOnComplete: true,
      },
    );
  }
}
