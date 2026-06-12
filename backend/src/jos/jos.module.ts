import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JosService } from './jos.service';
import { JosController } from './jos.controller';
import { SnapshotService } from './snapshot.service';
import { GrowthEngineService } from './growth-engine.service';
import { AgentsModule } from '../agents/agents.module';
import { ActivityModule } from '../activity/activity.module';
import { SoulModule } from '../common/soul/soul.module';
import { AbigailModule } from '../abigail/abigail.module';
import { IssuesModule } from '../issues/issues.module';
import { AdsModule } from '../ads/ads.module';
import { ManagersModule } from '../managers/managers.module';
import { MemoryModule } from '../memory/memory.module';
import { AgentSession } from '../abigail/entities/agent-session.entity';
import { Business } from '../setup-business/entities/business.entity';
import { AdCampaign } from '../ads/entities/ad-campaign.entity';
import { AgentEvolutionEvent } from './entities/agent-evolution-event.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { WorkforceModule } from '../workforce/workforce.module';
import { ClaraModule } from '../clara/clara.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentSession,
      Business,
      AdCampaign,
      AgentEvolutionEvent,
      AgentEpisode,
    ]),
    AgentsModule,
    ActivityModule,
    SoulModule,
    forwardRef(() => AbigailModule),
    IssuesModule,
    AdsModule,
    ManagersModule,
    forwardRef(() => MemoryModule),
    WorkforceModule,
    forwardRef(() => ClaraModule),
  ],
  controllers: [JosController],
  providers: [JosService, SnapshotService, GrowthEngineService],
  exports: [JosService, SnapshotService],
})
export class JosModule {}
