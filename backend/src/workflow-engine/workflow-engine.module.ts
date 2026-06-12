import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowStepExecution } from './entities/workflow-step-execution.entity';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { WorkflowProcessor } from './workflow-engine.processor';
import { WorkflowEngineController } from './workflow-engine.controller';
import { WORKFLOW_ENGINE_QUEUE } from './workflow-engine.queue';
import { AUDIT_LOOP_QUEUE } from '../audit-loop/audit-loop.queue';
import { PromptEngineModule } from '../prompt-engine/prompt-engine.module';
import { HermesModule } from '../hermes/hermes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinition,
      WorkflowExecution,
      WorkflowStepExecution,
    ]),
    BullModule.registerQueue(
      { name: WORKFLOW_ENGINE_QUEUE },
      { name: AUDIT_LOOP_QUEUE },
    ),
    PromptEngineModule,
    HermesModule,
  ],
  providers: [WorkflowExecutorService, WorkflowProcessor],
  controllers: [WorkflowEngineController],
  exports: [WorkflowExecutorService],
})
export class WorkflowEngineModule {}
