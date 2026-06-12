import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectFeedMessage } from './entities/project-feed-message.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { AgentMessageEvent } from '../agent-chat/agent-message.types';

@Injectable()
export class ProjectFeedService {
  constructor(
    @InjectRepository(ProjectFeedMessage)
    private readonly feedRepo: Repository<ProjectFeedMessage>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async addMessage(data: Partial<ProjectFeedMessage>) {
    const msg = this.feedRepo.create(data);
    const saved = await this.feedRepo.save(msg);
    // broadcast to standard room
    this.salesGateway.emitProjectFeedUpdate(saved.projectId, saved);
    return saved;
  }

  async getFeed(tenantId: string, projectId: string) {
    const feedMessages = await this.feedRepo.find({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const chatMessages = await this.chatRepo.find({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const projectedChat = chatMessages.map((message) => ({
      id: `chat:${message.id}`,
      tenantId: message.tenantId,
      projectId: message.projectId ?? projectId,
      type: 'agent_message' as const,
      specialist: message.agentName ?? message.senderRole,
      outcome: message.interactionType ?? null,
      content: message.content,
      refId: message.threadId,
      createdAt: message.createdAt,
    }));
    const seen = new Set<string>();
    return [...projectedChat, ...feedMessages]
      .filter((message) => {
        const key = `${message.specialist}:${message.outcome}:${message.content}:${new Date(message.createdAt).getTime()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 50);
  }

  async addChatMessage(event: AgentMessageEvent): Promise<void> {
    const msg = this.chatRepo.create({
      tenantId: event.tenantId,
      projectId: event.projectId,
      threadId: event.threadId,
      domain: event.domain,
      senderRole: event.fromAgent.startsWith('abigail')
        ? 'abigail'
        : 'specialist',
      senderType: 'agent',
      agentName: event.fromAgent,
      toAgent: event.toAgent ?? null,
      content: event.content,
      interactionType: event.interactionType,
    });
    const saved = await this.chatRepo.save(msg);
    const feedMsg = await this.feedRepo.save(
      this.feedRepo.create({
        tenantId: event.tenantId,
        projectId: event.projectId,
        type: 'agent_message',
        specialist: event.fromAgent,
        outcome: event.interactionType,
        content: event.content,
        refId: event.threadId,
      }),
    );
    // Broadcast on the project feed WebSocket room so the canvas updates in real-time
    this.salesGateway.emitProjectFeedUpdate(event.projectId, {
      type: 'agent_message',
      ...saved,
    });
    this.salesGateway.emitProjectFeedUpdate(event.projectId, feedMsg);
  }

  async getChatThread(
    tenantId: string,
    projectId: string,
    threadId?: string,
    limit = 100,
  ): Promise<ChatMessage[]> {
    const qb = this.chatRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId AND m.project_id = :projectId', {
        tenantId,
        projectId,
      })
      .orderBy('m.created_at', 'DESC')
      .take(limit);
    if (threadId) qb.andWhere('m.thread_id = :threadId', { threadId });
    const messages = await qb.getMany();
    return messages.reverse();
  }
  async addLifecycleEvent(
    tenantId: string,
    projectId: string,
    type:
      | 'lifecycle_started'
      | 'lifecycle_updated'
      | 'completion_review'
      | 'project_completed'
      | 'update_requested',
    content: string,
  ): Promise<void> {
    await this.addMessage({ tenantId, projectId, type, content });
  }
}
