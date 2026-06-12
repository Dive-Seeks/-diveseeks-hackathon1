import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChatMessage } from './entities/chat-message.entity';
import { CorrectionDetector } from './correction-detector';
import { EpisodeJobData } from '../memory/brain-memory.processor';
import { StreamingScrubber } from '../common/streaming-scrubber';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private scrubbers = new Map<string, StreamingScrubber>();

  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
    private readonly detector: CorrectionDetector,
    @InjectQueue('brain-memory') private readonly brainMemoryQueue: Queue,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async saveMessage(
    tenantId: string,
    domain: string,
    dto: any,
  ): Promise<ChatMessage> {
    const senderRole =
      (dto.senderRole as string) ||
      (dto.senderType === 'user' ? 'tenant' : 'specialist');
    const msg = this.repo.create({
      tenantId,
      domain,
      senderRole,
      ...dto,
    } as Partial<ChatMessage>);
    const saved = await this.repo.save(msg);
    if (dto.senderType === 'user') {
      await this.checkForCorrection(saved);
    }
    return saved;
  }

  async getHistory(
    tenantId: string,
    domain: string,
    page: number,
    limit: number,
  ) {
    const [data, total] = await this.repo.findAndCount({
      where: { tenantId, domain },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: (page - 1) * Math.min(limit, 100),
    });
    return { data, total, page, limit };
  }

  async getMessagesForSession(
    tenantId: string,
    domain: string,
  ): Promise<ChatMessage[]> {
    return this.repo.find({
      where: { tenantId, domain },
      order: { createdAt: 'ASC' },
    });
  }

  async getAllMessages(tenantId: string, page: number, limit: number) {
    const [data, total] = await this.repo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: (page - 1) * Math.min(limit, 100),
    });
    return { data, total, page, limit };
  }

  async checkForCorrection(message: ChatMessage): Promise<void> {
    const isCorrection = this.detector.isCorrection(message.content);
    if (!isCorrection) return;

    message.isCorrection = true;
    await this.repo.save(message);
    this.logger.log(
      `Correction detected for message ${message.id} — queuing learn job`,
    );

    const jobData: EpisodeJobData = {
      tenantId: message.tenantId,
      domain: message.domain,
      ownerType: 'agent',
      ownerId: `correction-${message.domain}`,
      episodeType: 'correction',
      keywords: message.content
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 8),
      summary: `User correction in ${message.domain}: "${message.content.slice(0, 200)}"`,
      userExplanation: message.content,
    };

    await this.brainMemoryQueue.add('learn', jobData);
  }

  streamChunk(
    tenantId: string,
    domain: string,
    streamId: string,
    chunk: string,
  ) {
    let scrubber = this.scrubbers.get(streamId);
    if (!scrubber) {
      scrubber = new StreamingScrubber();
      this.scrubbers.set(streamId, scrubber);
    }
    const cleanChunk = scrubber.process(chunk);
    if (cleanChunk) {
      this.chatGateway.emitToRoom(tenantId, domain, 'stream_chunk', {
        streamId,
        chunk: cleanChunk,
      });
    }
  }

  endStream(tenantId: string, domain: string, streamId: string) {
    const scrubber = this.scrubbers.get(streamId);
    if (scrubber) {
      const remaining = scrubber.flush();
      if (remaining) {
        this.chatGateway.emitToRoom(tenantId, domain, 'stream_chunk', {
          streamId,
          chunk: remaining,
        });
      }
      this.scrubbers.delete(streamId);
    }
    this.chatGateway.emitToRoom(tenantId, domain, 'stream_end', { streamId });
  }
}
