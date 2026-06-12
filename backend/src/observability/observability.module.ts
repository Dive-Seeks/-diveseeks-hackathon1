import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';

@Global()
@Module({
  providers: [MetricsService, HealthService],
  exports: [MetricsService, HealthService],
})
export class ObservabilityModule {}
