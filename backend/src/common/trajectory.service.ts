import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface TrajectoryEntry {
  conversations: Array<{
    from: 'system' | 'human' | 'gpt';
    value: string;
  }>;
  timestamp: string;
  model: string;
  completed: boolean;
  tenant_id: string;
  domain: string;
  specialist: string;
  gene_ids_applied: string[];
  compactions: number;
}

@Injectable()
export class TrajectoryService {
  private readonly logger = new Logger(TrajectoryService.name);

  constructor(
    @InjectQueue('brain-memory') private readonly brainQueue: Queue,
  ) {}

  async record(entry: TrajectoryEntry): Promise<void> {
    // Normalize reasoning tags
    entry.conversations = entry.conversations.map((msg) => {
      if (msg.from === 'gpt' && msg.value) {
        msg.value = msg.value
          .replace(/<REASONING_SCRATCHPAD>/g, '<think>')
          .replace(/<\/REASONING_SCRATCHPAD>/g, '</think>');
      }
      return msg;
    });

    try {
      await this.brainQueue.add('trajectory-write', entry);
    } catch (err) {
      this.logger.error(
        `Failed to queue trajectory: ${(err as Error).message}`,
      );
    }
  }
}
