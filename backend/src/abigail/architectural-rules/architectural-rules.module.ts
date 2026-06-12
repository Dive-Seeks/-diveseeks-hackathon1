import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTier } from './entities/project-tier.entity';
import { GlobalArchitecturalRule } from './entities/global-architectural-rule.entity';
import { ArchitecturalVerdict } from './entities/architectural-verdict.entity';
import { ArchitecturalOverride } from './entities/architectural-override.entity';
import { TaskSession } from '../entities/task-session.entity';
import { ProjectTierService } from './project-tier.service';
import { ProjectTierCron } from './project-tier.cron';
import { ArchitecturalRulesLoaderService } from './architectural-rules-loader.service';
import { ArchitecturalRulesEngine } from './architectural-rules.engine';
import { ArchitecturalRulesController } from './architectural-rules.controller';
import { CacheModule } from '../../common/cache/cache.module';
import { MemoryModule } from '../../memory/memory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectTier,
      GlobalArchitecturalRule,
      ArchitecturalVerdict,
      ArchitecturalOverride,
      TaskSession,
    ]),
    CacheModule,
    forwardRef(() => MemoryModule),
  ],
  controllers: [ArchitecturalRulesController],
  providers: [
    ProjectTierService,
    ProjectTierCron,
    ArchitecturalRulesLoaderService,
    ArchitecturalRulesEngine,
  ],
  exports: [ProjectTierService, ArchitecturalRulesEngine],
})
export class ArchitecturalRulesModule {}
