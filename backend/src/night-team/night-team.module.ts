import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NightTeamProcessor } from './night-team.processor';
import { AnalyticsAgentService } from './analytics-agent.service';
import { BugfixAgentService } from './bugfix-agent.service';
import { WriterAgentService } from './writer-agent.service';
import { DataAnalystService } from './data-analyst.service';
import { JosSynthesisService } from './jos-synthesis.service';
import { HeartbeatModule } from '../heartbeat/heartbeat.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { Agent } from '../agents/entities/agent.entity';
import { NightTeamController } from './night-team.controller';

import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'night-team' }),
    HeartbeatModule,
    TypeOrmModule.forFeature([AgentIssue, Agent]),
    MemoryModule,
  ],
  controllers: [NightTeamController],
  providers: [
    NightTeamProcessor,
    AnalyticsAgentService,
    BugfixAgentService,
    WriterAgentService,
    DataAnalystService,
    JosSynthesisService,
  ],
})
export class NightTeamModule implements OnModuleInit {
  constructor(@InjectQueue('night-team') private readonly queue: Queue) {}

  async onModuleInit() {
    // Register recurring cron jobs (idempotent — BullMQ deduplicates by jobId)
    await this.queue.add(
      'analytics',
      {},
      {
        repeat: { pattern: '0 2 * * *' }, // 02:00 daily
        jobId: 'night-analytics',
      },
    );
    await this.queue.add(
      'bugfix',
      {},
      {
        repeat: { pattern: '30 2 * * *' }, // 02:30 daily
        jobId: 'night-bugfix',
      },
    );
    await this.queue.add(
      'writer',
      {},
      {
        repeat: { pattern: '0 3 * * *' }, // 03:00 daily
        jobId: 'night-writer',
      },
    );
    await this.queue.add(
      'data-analyst',
      {},
      {
        repeat: { pattern: '30 3 * * *' }, // 03:30 daily
        jobId: 'night-data',
      },
    );
    await this.queue.add(
      'jos-synthesis',
      {},
      {
        repeat: { pattern: '0 4 * * *' }, // 04:00 daily (zero LLM)
        jobId: 'night-synthesis',
      },
    );
  }
}
