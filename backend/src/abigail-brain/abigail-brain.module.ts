import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AbigailBrainController } from './abigail-brain.controller';
import { AbigailBrainService } from './abigail-brain.service';
import { BrainSessionService } from './brain-session.service';
import { BrainIntentClassifierService } from './brain-intent-classifier.service';
import { BrainDispatchGuardService } from './brain-dispatch-guard.service';
import { BrainTechniqueService } from './brain-technique.service';
import { BrainLoopService } from './brain-loop.service';
import { BRAIN_LOOP_QUEUE } from './brain-loop.queue';
import { BrainLoopProcessor } from './brain-loop.processor';
import { BrainSession } from './entities/brain-session.entity';
import { BrainIdea } from './entities/brain-idea.entity';
import { BrainThread } from './entities/brain-thread.entity';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { McpRegistryModule } from '../mcp-registry/mcp-registry.module';
import { KnowledgeRegistrarModule } from '../knowledge-registrar/knowledge-registrar.module';
import { HermesModule } from '../hermes/hermes.module';
import { PromptEngineModule } from '../prompt-engine/prompt-engine.module';

import { shouldRunAiProcessors } from '../common/ai-worker-mode';

const processors = shouldRunAiProcessors() ? [BrainLoopProcessor] : [];

@Module({
  imports: [
    TypeOrmModule.forFeature([BrainSession, BrainIdea, BrainThread]),
    BullModule.registerQueue({
      name: BRAIN_LOOP_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    forwardRef(() => AiIntegrationModule),
    McpRegistryModule,
    KnowledgeRegistrarModule,
    HermesModule,
    PromptEngineModule,
  ],
  controllers: [AbigailBrainController],
  providers: [
    AbigailBrainService,
    BrainSessionService,
    BrainIntentClassifierService,
    BrainDispatchGuardService,
    BrainTechniqueService,
    BrainLoopService,
    ...processors,
  ],
  exports: [
    AbigailBrainService,
    BrainSessionService,
    BrainIntentClassifierService,
    BrainDispatchGuardService,
    BrainTechniqueService,
    BrainLoopService,
  ],
})
export class AbigailBrainModule {}
