import { Injectable, OnModuleInit } from '@nestjs/common';
import { CyclePubSubService } from '../common/cycle-pubsub.service';
import { ProjectFeedService } from './project-feed.service';
import { getSpecialistName } from './specialist-names';
import { AgentMessageEvent } from '../agent-chat/agent-message.types';

@Injectable()
export class ProjectFeedListener implements OnModuleInit {
  constructor(
    private readonly cyclePubSub: CyclePubSubService,
    private readonly projectFeedService: ProjectFeedService,
  ) {}

  onModuleInit() {
    this.cyclePubSub.onVisionReady(async (event) => {
      await this.projectFeedService.addMessage({
        tenantId: event.tenantId,
        projectId: event.projectId,
        type: 'vision_ready',
        specialist: 'system',
        outcome: 'success',
        content: `System finished initial vision setup: identified ${event.taskCount} tasks across ${event.goalTitles.length} goals. Preparing to dispatch.`,
      });
    });

    this.cyclePubSub.onCycleCompleted(async (event) => {
      if (event.type !== 'task_session') return;

      const specName = getSpecialistName(event.specialist);
      let content = '';
      if (event.outcome === 'pass') {
        content = `${specName} completed their task successfully. ${event.taskDescription || ''}`;
      } else if (event.outcome === 'fail') {
        content = `${specName} reported a failure and needs assistance.`;
      } else {
        content = `${specName} requested human review.`;
      }

      await this.projectFeedService.addMessage({
        tenantId: event.tenantId,
        projectId: event.projectId,
        type: 'task_complete',
        specialist: event.specialist,
        outcome: event.outcome,
        refId: event.episodeId || event.refId,
        content: content.trim(),
      });
    });

    this.cyclePubSub.onAgentMessage(async (event: AgentMessageEvent) => {
      await this.projectFeedService.addChatMessage(event).catch((err) => {
        // Non-fatal — canvas messages must not crash the feed listener
        console.error(
          '[ProjectFeedListener] addChatMessage failed:',
          (err as Error).message,
        );
      });
    });
  }
}
