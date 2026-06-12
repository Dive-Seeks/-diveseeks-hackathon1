import { Global, Module } from '@nestjs/common';
import { TenantJobService } from './tenant-job.service';

@Global()
@Module({
  providers: [TenantJobService],
  exports: [TenantJobService],
})
export class AbigailCoreModule {}
