import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CyclePubSubService,
  VisionReadyEvent,
} from '../common/cycle-pubsub.service';
import { ProjectFeedService } from './project-feed.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class VisionReadyListener implements OnModuleInit {
  constructor(
    private readonly cyclePubSub: CyclePubSubService,
    private readonly feedService: ProjectFeedService,
    private readonly salesGateway: SalesGateway,
  ) {}

  onModuleInit(): void {
    this.cyclePubSub.onVisionReady((event) => void this.handle(event));
  }

  private async handle(event: VisionReadyEvent): Promise<void> {
    const summary =
      event.taskCount > 0
        ? `Abigail created ${event.taskCount} task(s) across ${event.goalTitles.length} goal(s): ${event.goalTitles.join(', ')}`
        : `Abigail is reviewing vision goals — tasks will appear shortly`;

    const msg = await this.feedService.addMessage({
      tenantId: event.tenantId,
      projectId: event.projectId,
      type: 'vision_ready',
      content: summary,
    });

    // Notify canvas listeners that tasks were created so they refetch
    this.salesGateway.emitProjectFeedUpdate(event.projectId, {
      type: 'tasks_created',
      projectId: event.projectId,
      count: event.taskCount,
      goals: event.goalTitles,
    });
  }
}
