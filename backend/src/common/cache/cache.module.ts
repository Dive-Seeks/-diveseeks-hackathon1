import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { RequestDedupService } from '../utils/request-dedup.service';

@Global()
@Module({
  providers: [RedisCacheService, RequestDedupService],
  exports: [RedisCacheService, RequestDedupService],
})
export class CacheModule {}
