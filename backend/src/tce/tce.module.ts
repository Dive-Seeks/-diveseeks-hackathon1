import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpModule } from '../mcp/mcp.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { DeepReasoningModule } from '../abigail/deep-reasoning/deep-reasoning.module';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { AbigailModule } from '../abigail/abigail.module';
import { AbigailBrainModule } from '../abigail-brain/abigail-brain.module';
import { MemoryModule } from '../memory/memory.module';
import { TokenizerModule } from '../tokenizer/tokenizer.module';
import { KnowledgeStoreModule } from '../knowledge-store/knowledge-store.module';
import { DataEngineModule } from '../data-engine/data-engine.module';
// UnifiedKnowledgeService + DataEngineContextService are exported from AbigailModule
// AiProviderRouter is exported from CommonModule (@Global) — no local re-declaration needed

import { TCETask } from './entities/tce-task.entity';
import { DiveSeeksProject } from './entities/diveseeks-project.entity';
import { WikiPage } from '../data-engine/entities/wiki-page.entity';
import { DataRepo } from '../data-engine/entities/data-repo.entity';
import { AiConfiguration } from '../ai-integration/entities/ai-configuration.entity';
import { BrainIdea } from '../abigail-brain/entities/brain-idea.entity';
import { TceService } from './tce.service';
import { TceScheduler } from './tce.scheduler';
import { TceController } from './tce.controller';

import { VisionService } from './vision/vision.service';
import { VisionChatService } from './vision/vision-chat.service';
import { VisionWizardService } from './vision/vision-wizard.service';
import { VisionConflictService } from './vision/vision-conflict.service';
import { VisionUpdaterService } from './vision/vision-updater.service';
import { VisionSeederService } from './vision/vision-seeder.service';
import { SmartVisionSetupService } from './vision/smart-vision-setup.service';
import { VisionInterviewService } from './vision/vision-interview.service';
import { BrainToVisionBridgeService } from './vision/brain-to-vision-bridge.service';

import { GapAnalyzerService } from './gap-analysis/gap-analyzer.service';
import { GoalDecomposerService } from './gap-analysis/goal-decomposer.service';
import { PriorityScorerService } from './gap-analysis/priority-scorer.service';

import { ProgressService } from './progress/progress.service';
import { GoalTrackerService } from './progress/goal-tracker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TCETask,
      DiveSeeksProject,
      WikiPage,
      DataRepo,
      AiConfiguration,
      BrainIdea,
    ]),
    McpModule,
    GatewaysModule,
    DeepReasoningModule,
    AiIntegrationModule,
    forwardRef(() => AbigailModule),
    AbigailBrainModule,
    MemoryModule,
    TokenizerModule,
    KnowledgeStoreModule,
    DataEngineModule,
  ],
  controllers: [TceController],
  providers: [
    TceService,
    TceScheduler,
    VisionService,
    VisionChatService,
    VisionWizardService,
    VisionConflictService,
    VisionUpdaterService,
    VisionSeederService,
    SmartVisionSetupService,
    VisionInterviewService,
    BrainToVisionBridgeService,
    GapAnalyzerService,
    GoalDecomposerService,
    PriorityScorerService,
    ProgressService,
    GoalTrackerService,
    // SmartVisionSetupService depends on UnifiedKnowledgeService (from AbigailModule)
    // and AiProviderRouter (global via CommonModule) — no local re-declaration needed
  ],
  exports: [
    TceService,
    TceScheduler,
    VisionService,
    VisionConflictService,
    VisionUpdaterService,
    VisionSeederService,
    GoalTrackerService,
  ],
})
export class TceModule {}
