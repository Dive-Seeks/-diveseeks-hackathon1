import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentRegistryService } from './agent-registry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent])],
  providers: [AgentRegistryService],
  exports: [AgentRegistryService],
})
export class AgentRegistryModule {}
