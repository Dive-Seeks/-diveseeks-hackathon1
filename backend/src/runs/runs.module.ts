import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentHeartbeatRun } from './entities/agent-heartbeat-run.entity';
import { RunsService } from './runs.service';
import { RunsController } from './runs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentHeartbeatRun])],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
