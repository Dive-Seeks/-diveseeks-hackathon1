import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { AgentWakeupQueue } from '../common/entities/agent-wakeup-queue.entity';
import { HeartbeatService } from './heartbeat.service';
import { HeartbeatContextService } from './heartbeat-context.service';
import { SkillEngineService } from './skill-engine.service';
import { CerebellumService } from './cerebellum.service';
import { LivenessService } from './liveness.service';
import { WakeupQueueProcessor } from './wakeup-queue.processor';
import { CaiEngineService } from '../common/cai/cai-engine.service';
import { AgentsModule } from '../agents/agents.module';
import { IssuesModule } from '../issues/issues.module';
import { RunsModule } from '../runs/runs.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ActivityModule } from '../activity/activity.module';
import { SoulModule } from '../common/soul/soul.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { MemoryModule } from '../memory/memory.module';
import { CoordinatorModule } from '../coordinator/coordinator.module';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { ChatModule } from '../chat/chat.module';
import { TaskPrdModule } from '../task-prd/task-prd.module';
import { EvolveModule } from '../evolve/evolve.module';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'wakeup-queue' }),
    AgentsModule,
    IssuesModule,
    RunsModule,
    ApprovalsModule,
    ActivityModule,
    SoulModule,
    WorkforceModule,
    forwardRef(() => MemoryModule),
    CoordinatorModule,
    AiIntegrationModule,
    ChatModule,
    TaskPrdModule,
    EvolveModule,
    GithubModule,
    TypeOrmModule.forFeature([AgentIssue, AgentWakeupQueue]),
  ],
  providers: [
    HeartbeatService,
    HeartbeatContextService,
    SkillEngineService,
    CerebellumService,
    LivenessService,
    WakeupQueueProcessor,
    CaiEngineService,
  ],
  exports: [HeartbeatService, SkillEngineService],
})
export class HeartbeatModule {}
