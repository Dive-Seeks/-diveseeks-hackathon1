import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SandboxRecord } from './entities/sandbox-record.entity';
import { SandboxSession } from './entities/sandbox-session.entity';
import { SandboxService } from './sandbox.service';
import { SandboxExecutorService } from './sandbox-executor.service';
import { SandboxCleanupProcessor } from './sandbox-cleanup.processor';
import { PortAllocatorService } from './port-allocator.service';
import { SandboxScheduler } from './sandbox.scheduler';
import { SandboxController } from './sandbox.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SandboxRecord, SandboxSession]),
    BullModule.registerQueue({ name: 'sandbox-cleanup' }),
  ],
  controllers: [SandboxController],
  providers: [
    SandboxService,
    SandboxExecutorService,
    SandboxCleanupProcessor,
    PortAllocatorService,
    SandboxScheduler,
  ],
  exports: [SandboxService, SandboxExecutorService],
})
export class SandboxModule {}
