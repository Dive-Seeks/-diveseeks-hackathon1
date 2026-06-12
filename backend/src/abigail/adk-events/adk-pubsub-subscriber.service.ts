import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PubSub, Subscription } from '@google-cloud/pubsub';
import { AdkEventTranslatorService } from './adk-event-translator.service';

@Injectable()
export class AdkPubSubSubscriberService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AdkPubSubSubscriberService.name);
  private pubsub: PubSub | null = null;
  private subscription: Subscription | null = null;

  constructor(private readonly translator: AdkEventTranslatorService) {}

  async onModuleInit() {
    if (process.env.WORKFLOW_BACKEND !== 'adk') return;
    try {
      this.pubsub = new PubSub();
      this.subscription = this.pubsub.subscription(
        process.env.ADK_PUBSUB_SUBSCRIPTION ?? 'dive-adk-events-sub',
      );
      this.subscription.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.data.toString());
          this.translator.handle(data);
          msg.ack();
        } catch (e) {
          this.logger.error(
            `[PubSub] Failed to parse message: ${(e as Error).message}`,
          );
          msg.ack();
        }
      });
      this.subscription.on('error', (err) =>
        this.logger.error(`[PubSub] error: ${err.message}`),
      );
      this.logger.log('Started listening to ADK Pub/Sub events');
    } catch (e) {
      this.logger.error(`[PubSub] Init failed: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.subscription) {
      await this.subscription.close();
      this.logger.log('Stopped listening to ADK Pub/Sub events');
    }
  }
}
