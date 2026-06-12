import { Injectable, Logger } from '@nestjs/common';
import { CyclePubSubService } from '../common/cycle-pubsub.service';
import { AgentMessageEvent } from './agent-message.types';

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);

  constructor(private readonly cyclePubSub: CyclePubSubService) {}

  emit(event: AgentMessageEvent): void {
    // Fire-and-forget — canvas messages are non-critical
    this.cyclePubSub
      .publishAgentMessage(event)
      .catch((err) =>
        this.logger.warn(
          `AgentChatService.emit failed: ${(err as Error).message}`,
        ),
      );
  }
}
