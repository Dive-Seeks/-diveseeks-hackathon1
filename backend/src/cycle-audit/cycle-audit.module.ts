import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CycleAuditResult } from './entities/cycle-audit-result.entity';
import { CycleAuditService } from './cycle-audit.service';
import { CycleAuditController } from './cycle-audit.controller';
import { RedisProbeService } from './probes/redis-probe.service';
import { DbProbeService } from './probes/db-probe.service';
import { QueueProbeService } from './probes/queue-probe.service';
import { HttpProbeService } from './probes/http-probe.service';
import { LlmProbeService } from './probes/llm-probe.service';
import { ObservabilityModule } from '../observability/observability.module';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CycleAuditResult]),
    ObservabilityModule,
    CacheModule,
  ],
  providers: [
    CycleAuditService,
    RedisProbeService,
    DbProbeService,
    QueueProbeService,
    HttpProbeService,
    LlmProbeService,
  ],
  controllers: [CycleAuditController],
  exports: [CycleAuditService],
})
export class CycleAuditModule {}
