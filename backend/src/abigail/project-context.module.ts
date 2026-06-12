import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProjectContextService } from './project-context.service';
import { ProjectCardService } from './project-card.service';
import { ParametricWeight } from '../memory/entities/parametric-weight.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { AuditFinding } from '../audit-loop/entities/audit-loop.entity';
import { TaskSession } from './entities/task-session.entity';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { VisionService } from '../tce/vision/vision.service';
import { DataEngineModule } from '../data-engine/data-engine.module';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { TokenizerModule } from '../tokenizer/tokenizer.module';
import { KnowledgeStoreModule } from '../knowledge-store/knowledge-store.module';
import { CommonModule } from '../common/common.module';
import { WikiPage } from '../data-engine/entities/wiki-page.entity';
import { DataRepo } from '../data-engine/entities/data-repo.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ParametricWeight,
      AgentEpisode,
      AuditFinding,
      TaskSession,
      DiveSeeksProject,
      TCETask,
      WikiPage,
      DataRepo,
    ]),
    TokenizerModule,
    CommonModule,
    KnowledgeStoreModule,
    DataEngineModule,
  ],
  providers: [
    VisionService,
    RedisCacheService,
    ProjectCardService,
    ProjectContextService,
  ],
  exports: [ProjectContextService, ProjectCardService],
})
export class ProjectContextModule {}
