import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { MemoryMcpServer } from './memory-mcp.server';
import { ProjectContextModule } from '../abigail/project-context.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEpisode]), ProjectContextModule],
  providers: [MemoryMcpServer],
  exports: [MemoryMcpServer],
})
export class MemoryMcpModule {}
