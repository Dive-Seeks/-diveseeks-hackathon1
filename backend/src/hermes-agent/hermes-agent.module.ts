import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { HermesAgentInstance } from './entities/hermes-agent-instance.entity';
import { HermesAgentInstanceService } from './hermes-agent-instance.service';
import { HermesAgentController } from './hermes-agent.controller';
import { HermesAgentService } from './hermes-agent.service';
import { HermesAgentSupervisorClient } from './hermes-agent-supervisor.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([HermesAgentInstance]),
    HttpModule,
    AiIntegrationModule,
  ],
  controllers: [HermesAgentController],
  providers: [
    HermesAgentInstanceService,
    HermesAgentSupervisorClient,
    HermesAgentService,
  ],
  exports: [HermesAgentService],
})
export class HermesAgentModule {}
