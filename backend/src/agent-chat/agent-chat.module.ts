import { Module } from '@nestjs/common';
import { AgentChatService } from './agent-chat.service';

@Module({
  providers: [AgentChatService],
  exports: [AgentChatService],
})
export class AgentChatModule {}
