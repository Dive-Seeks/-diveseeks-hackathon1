import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

export const CYCLE_COMPLETED_CHANNEL = 'cycle:completed';

export interface CycleCompletedEvent {
  tenantId: string;
  projectId: string;
  type: 'task_session' | 'audit_round';
  refId: string;
  outcome: 'pass' | 'fail' | 'needs_review';
  specialist: string;
  team?: string;
  at: string;
  episodeId?: string;
  taskDescription?: string;
}

export const VISION_READY_CHANNEL = 'vision:ready';

export const AGENT_MESSAGE_CHANNEL = 'agent:message';

export interface VisionReadyEvent {
  tenantId: string;
  userId: string;
  projectId: string;
  teamId: string;
  team: string;
  projectName: string;
  taskCount: number;
  goalTitles: string[];
}

type CycleHandler = (event: CycleCompletedEvent) => void | Promise<void>;

@Injectable()
export class CyclePubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(CyclePubSubService.name);
  private readonly publisher: Redis | null;
  private readonly subscriber: Redis | null;
  private readonly localBus = new EventEmitter();

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');
    const password = this.configService.get<string>('REDIS_PASSWORD');

    if (host && port) {
      const opts = {
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 2 as const,
      };
      this.publisher = new Redis(opts);
      this.subscriber = new Redis(opts);
      void this.publisher
        .connect()
        .catch(() =>
          this.logger.warn(
            'Cycle pub/sub publisher connect failed — using in-memory bus',
          ),
        );
      void this.subscriber
        .connect()
        .then(() =>
          this.subscriber!.subscribe(
            CYCLE_COMPLETED_CHANNEL,
            VISION_READY_CHANNEL,
            AGENT_MESSAGE_CHANNEL,
          ),
        )
        .catch(() =>
          this.logger.warn(
            'Cycle pub/sub subscriber connect failed — using in-memory bus',
          ),
        );
      this.subscriber.on('message', (channel, raw) => {
        if (
          channel !== CYCLE_COMPLETED_CHANNEL &&
          channel !== VISION_READY_CHANNEL &&
          channel !== AGENT_MESSAGE_CHANNEL
        )
          return;
        try {
          this.localBus.emit(channel, JSON.parse(raw));
        } catch (err) {
          this.logger.warn(
            `Cycle event parse failed: ${(err as Error).message}`,
          );
        }
      });
    } else {
      this.publisher = null;
      this.subscriber = null;
      this.logger.warn(
        'Redis config missing — cycle pub/sub uses in-memory bus',
      );
    }
  }

  async publishCycleCompleted(event: CycleCompletedEvent): Promise<void> {
    const payload = JSON.stringify(event);
    if (this.publisher && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(CYCLE_COMPLETED_CHANNEL, payload);
        return;
      } catch (err) {
        this.logger.warn(
          `Cycle publish failed, using in-memory bus: ${(err as Error).message}`,
        );
      }
    }
    this.localBus.emit(CYCLE_COMPLETED_CHANNEL, event);
  }

  onCycleCompleted(handler: CycleHandler): void {
    this.localBus.on(CYCLE_COMPLETED_CHANNEL, (event: CycleCompletedEvent) => {
      void Promise.resolve(handler(event)).catch((err) =>
        this.logger.error(`Cycle handler error: ${(err as Error).message}`),
      );
    });
  }

  async publishVisionReady(event: VisionReadyEvent): Promise<void> {
    const payload = JSON.stringify(event);
    if (this.publisher && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(VISION_READY_CHANNEL, payload);
        return;
      } catch (err) {
        this.logger.warn(
          `VisionReady publish failed, using in-memory bus: ${(err as Error).message}`,
        );
      }
    }
    this.localBus.emit(VISION_READY_CHANNEL, event);
  }

  onVisionReady(
    handler: (event: VisionReadyEvent) => void | Promise<void>,
  ): void {
    this.localBus.on(VISION_READY_CHANNEL, (event: VisionReadyEvent) => {
      void Promise.resolve(handler(event)).catch((err) =>
        this.logger.error(
          `VisionReady handler error: ${(err as Error).message}`,
        ),
      );
    });
  }

  async publishAgentMessage(
    event: import('../agent-chat/agent-message.types').AgentMessageEvent,
  ): Promise<void> {
    const payload = JSON.stringify(event);
    if (this.publisher && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(AGENT_MESSAGE_CHANNEL, payload);
        return;
      } catch (err) {
        this.logger.warn(
          `AgentMessage publish failed, using in-memory bus: ${(err as Error).message}`,
        );
      }
    }
    this.localBus.emit(AGENT_MESSAGE_CHANNEL, event);
  }

  onAgentMessage(
    handler: (
      event: import('../agent-chat/agent-message.types').AgentMessageEvent,
    ) => void | Promise<void>,
  ): void {
    this.localBus.on(AGENT_MESSAGE_CHANNEL, (event) => {
      Promise.resolve(handler(event)).catch((err) =>
        this.logger.warn(
          `onAgentMessage handler error: ${(err as Error).message}`,
        ),
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.localBus.removeAllListeners();
    if (this.publisher) await this.publisher.quit().catch(() => undefined);
    if (this.subscriber) await this.subscriber.quit().catch(() => undefined);
  }
}
