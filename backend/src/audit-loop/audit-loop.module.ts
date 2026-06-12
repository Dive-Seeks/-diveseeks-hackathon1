import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  AuditLoop,
  AuditArtifact,
  AuditFinding,
  AuditScore,
  AuditRubric,
} from './entities/audit-loop.entity';
import { AuditOrchestratorService } from './services/audit-orchestrator.service';
import { AuditorService } from './services/auditor.service';
import { AuditProcessor } from './audit-loop.processor';
import { AUDIT_LOOP_QUEUE } from './audit-loop.queue';
import { AuditLoopController } from './audit-loop.controller';
import { PromptEngineModule } from '../prompt-engine/prompt-engine.module';
import { AuditLoopSeederService } from './services/audit-loop-seeder.service';
import { PromptTemplate } from '../prompt-engine/entities/prompt-template.entity';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { EvolveModule } from '../evolve/evolve.module';
import { HermesModule } from '../hermes/hermes.module';
import { MemoryModule } from '../memory/memory.module';
import { CommonModule } from '../common/common.module';

import { PlanGeneratorService } from './services/plan-generator.service';
import { WorkflowSpecGeneratorService } from './services/workflow-spec-generator.service';
import { PlanAuditorService } from './services/plan-auditor.service';
import { WorkflowAuditorService } from './services/workflow-auditor.service';
import { StreamAuditorService } from './services/stream-auditor.service';
import { MistakeProcessorService } from './services/mistake-processor.service';
import { FinalAuditorService } from './services/final-auditor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLoop,
      AuditArtifact,
      AuditFinding,
      AuditScore,
      AuditRubric,
      PromptTemplate,
    ]),
    BullModule.registerQueue({ name: AUDIT_LOOP_QUEUE }),
    PromptEngineModule,
    WorkflowEngineModule,
    EvolveModule,
    HermesModule,
    MemoryModule,
    CommonModule,
  ],
  providers: [
    AuditOrchestratorService,
    AuditorService,
    AuditProcessor,
    AuditLoopSeederService,
    PlanGeneratorService,
    WorkflowSpecGeneratorService,
    PlanAuditorService,
    WorkflowAuditorService,
    StreamAuditorService,
    MistakeProcessorService,
    FinalAuditorService,
  ],
  controllers: [AuditLoopController],
  exports: [AuditOrchestratorService],
})
export class AuditLoopModule {}
