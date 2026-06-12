import './tracing';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { BullModule } from '@nestjs/bullmq';
import { AgentEpisode } from './memory/agent-episode.entity';
import { ParametricWeight } from './memory/entities/parametric-weight.entity';
import { AuditFinding } from './audit-loop/entities/audit-loop.entity';
import { TaskSession } from './abigail/entities/task-session.entity';
import { MemoryMcpModule } from './mcp-server/memory-mcp.module';
import { WikiPage } from './data-engine/entities/wiki-page.entity';
import { DataRepo } from './data-engine/entities/data-repo.entity';

// Minimal NestJS app to host the MCP memory server alongside TypeORM
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ObservabilityModule } from './observability/observability.module';
import { CacheModule } from './common/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CacheModule,
    ObservabilityModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        AgentEpisode,
        ParametricWeight,
        AuditFinding,
        TaskSession,
        WikiPage,
        DataRepo,
      ],
      synchronize: false,
    }),
    MemoryMcpModule,
  ],
})
class McpAppModule {}

async function bootstrapMcp() {
  const logger = new Logger('McpBootstrap');
  const app = await NestFactory.create(McpAppModule);

  // Enable graceful shutdown so node --watch restarts release the port quickly.
  // Without this, the old process holds the port for 1-2s causing EADDRINUSE.
  app.enableShutdownHooks();

  const nestPort = Number(process.env.MCP_NEST_PORT ?? 7773);
  await app.listen(nestPort);
  logger.log(
    `MCP NestJS app running on port ${nestPort} — MCP transport on port ${process.env.MCP_MEMORY_PORT ?? 7772}`,
  );
}

bootstrapMcp().catch((err) => {
  new Logger('McpBootstrap').error(err);
  process.exit(1);
});
