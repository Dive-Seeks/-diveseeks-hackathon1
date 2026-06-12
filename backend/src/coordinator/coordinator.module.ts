import { Module, forwardRef } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { CoordinatorJob } from './entities/coordinator-job.entity';
import { TokenSpendEvent } from './entities/token-spend-event.entity';
import { TenantBudget } from './entities/tenant-budget.entity';
import { CoordinatorService } from './coordinator.service';

import { CoordinatorJobService } from './coordinator-job.service';
import { CoordinatorSecurityService } from './coordinator-security.service';
import { CoordinatorWatchService } from './coordinator-watch.service';
import { CoordinatorCronService } from './coordinator-cron.service';
import { BudgetService } from './budget.service';
import { CoordinatorController } from './coordinator.controller';

import { TaskSession } from '../abigail/entities/task-session.entity';
import { McpServerRegistration } from '../mcp-registry/entities/mcp-server-registration.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentsModule } from '../agents/agents.module';
import { McpRegistryModule } from '../mcp-registry/mcp-registry.module';
import { PromptEngineModule } from '../prompt-engine/prompt-engine.module';
import { HermesModule } from '../hermes/hermes.module';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoordinatorJob,
      TaskSession,
      McpServerRegistration,
      TCETask,
      Agent,
      TokenSpendEvent,
      TenantBudget,
    ]),

    AgentsModule,
    McpRegistryModule,
    forwardRef(() => PromptEngineModule),
    HermesModule,
    CacheModule,
  ],

  controllers: [CoordinatorController],
  providers: [
    CoordinatorService,
    CoordinatorJobService,
    CoordinatorSecurityService,
    CoordinatorWatchService,
    CoordinatorCronService,
    BudgetService,
  ],
  exports: [CoordinatorService, CoordinatorJobService, BudgetService],
})
export class CoordinatorModule {}
