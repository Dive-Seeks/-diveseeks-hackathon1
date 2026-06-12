import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DispatchEngineService } from './dispatch-engine.service';
import { DispatchContextAssembler } from './dispatch-context-assembler.service';
import { TaskOutcomeMapper } from './task-outcome-mapper.service';
import { TaskStepLog } from '../entities/task-step-log.entity';
import { TaskSession } from '../entities/task-session.entity';
import { TCETask } from '../../tce/entities/tce-task.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { TaskPrdFeatureMap } from '../../task-prd/entities/task-prd-feature-map.entity';
import { AgentIssue } from '../../issues/entities/agent-issue.entity';
import { GatewaysModule } from '../../gateways/gateways.module';
import { AbigailBrainModule } from '../../abigail-brain/abigail-brain.module';
import { MemoryModule } from '../../memory/memory.module';
import { TceModule } from '../../tce/tce.module';
import { TokenizerModule } from '../../tokenizer/tokenizer.module';
import { WorkforceModule } from '../../workforce/workforce.module';
import { AgentsModule } from '../../agents/agents.module';
import { HermesModule } from '../../hermes/hermes.module';
import { McpRegistryModule } from '../../mcp-registry/mcp-registry.module';
import { TaskPrdModule } from '../../task-prd/task-prd.module';
import { DataEngineModule } from '../../data-engine/data-engine.module';
import { IssuesModule } from '../../issues/issues.module';
import { EvolveModule } from '../../evolve/evolve.module';
import { AgentChatModule } from '../../agent-chat/agent-chat.module';
import { CommonModule } from '../../common/common.module';
import { HttpModule } from '@nestjs/axios';
import { LocalSpecialistExecutor } from '../specialist-executor/local-specialist.executor';
import { AdkSpecialistExecutor } from '../specialist-executor/adk-specialist.executor';
import { HermesAgentSpecialistExecutor } from '../specialist-executor/hermes-agent-specialist.executor';
import { RoutingSpecialistExecutor } from '../specialist-executor/routing-specialist.executor';
import { specialistExecutorProvider } from '../specialist-executor/specialist-executor.provider';
import { AbigailModule } from '../abigail.module';
import { HeartbeatModule } from '../../heartbeat/heartbeat.module';
import { HermesAgentModule } from '../../hermes-agent/hermes-agent.module';

@Module({
  imports: [
    forwardRef(() => AbigailModule),
    TypeOrmModule.forFeature([
      TaskStepLog,
      TaskSession,
      ChatMessage,
      TaskPrdFeatureMap,
      AgentIssue,
      TCETask,
    ]),
    ScheduleModule.forRoot(),
    GatewaysModule,
    AbigailBrainModule,
    MemoryModule,
    TceModule,
    TokenizerModule,
    WorkforceModule,
    AgentsModule,
    HermesModule,
    McpRegistryModule,
    TaskPrdModule,
    DataEngineModule,
    IssuesModule,
    EvolveModule,
    AgentChatModule,
    CommonModule,
    HttpModule,
    HeartbeatModule,
    HermesAgentModule,
  ],
  providers: [
    DispatchContextAssembler,
    TaskOutcomeMapper,
    DispatchEngineService,
    LocalSpecialistExecutor,
    AdkSpecialistExecutor,
    HermesAgentSpecialistExecutor,
    RoutingSpecialistExecutor,
    specialistExecutorProvider,
  ],
  exports: [DispatchEngineService],
})
export class DispatchEngineModule {}
