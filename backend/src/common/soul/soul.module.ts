import { Global, Module } from '@nestjs/common';
import { SoulEngine } from './soul-engine.service';

@Global()
@Module({
  providers: [SoulEngine],
  exports: [SoulEngine],
})
export class SoulModule {}
