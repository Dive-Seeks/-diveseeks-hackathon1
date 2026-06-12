import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import {
  AgentSession,
  AgentSessionStatus,
} from './entities/agent-session.entity';
import { SnapshotService } from '../jos/snapshot.service';
import {
  TrajectoryService,
  TrajectoryEntry,
} from '../common/trajectory.service';

@Injectable()
export class AgentSessionsService {
  constructor(
    @InjectRepository(AgentSession)
    private readonly repo: Repository<AgentSession>,
    @Optional() private readonly snapshot?: SnapshotService,
    @Optional() private readonly trajectory?: TrajectoryService,
    @Optional()
    @InjectQueue('brain-memory')
    private readonly brainMemoryQueue?: Queue,
  ) {}

  async create(
    tenantId: string,
    domain: string,
    siteId?: string,
  ): Promise<AgentSession> {
    const session = this.repo.create({
      tenantId,
      domain,
      siteId,
      status: 'running',
    });
    return this.repo.save(session);
  }

  async findOne(id: string, tenantId: string): Promise<AgentSession> {
    const session = await this.repo.findOne({ where: { id, tenantId } });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  /**
   * Convert the session journey (jsonb array of messages) into ShareGPT format.
   * Each message is expected to have `role` ('user' | 'assistant' | 'system') and `content`.
   * Falls back gracefully if journey is null, not an array, or has unexpected shape.
   */
  private buildConversations(
    journey: object | null,
  ): Array<{ from: 'system' | 'human' | 'gpt'; value: string }> {
    if (!journey || !Array.isArray(journey) || journey.length === 0) return [];

    const roleMap: Record<string, 'system' | 'human' | 'gpt'> = {
      system: 'system',
      user: 'human',
      human: 'human',
      assistant: 'gpt',
      gpt: 'gpt',
    };

    return journey
      .filter(
        (msg: any) =>
          msg && typeof msg === 'object' && msg.role && msg.content != null,
      )
      .map((msg: any) => ({
        from: roleMap[String(msg.role).toLowerCase()] ?? 'human',
        value:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      }));
  }

  private async emitTrajectory(session: AgentSession, completed: boolean) {
    if (!this.trajectory) return;
    const entry: TrajectoryEntry = {
      conversations: this.buildConversations(session.journey),
      timestamp: new Date().toISOString(),
      model: 'gemini-2.5-pro',
      completed,
      tenant_id: session.tenantId,
      domain: session.domain,
      specialist: session.domain,
      gene_ids_applied: [],
      compactions: session.lastCompactionSavings?.length ?? 0,
    };
    await this.trajectory.record(entry);
  }

  async patch(
    id: string,
    tenantId: string,
    patch: Partial<AgentSession>,
  ): Promise<AgentSession> {
    await this.repo.update({ id, tenantId }, patch);
    const session = await this.findOne(id, tenantId);

    if (patch.status === 'failed' || patch.status === 'rejected') {
      await this.emitTrajectory(session, false);
    } else if (patch.status === 'approved') {
      await this.emitTrajectory(session, true);
    }

    return session;
  }

  async approve(id: string, tenantId: string): Promise<AgentSession> {
    const session = await this.findOne(id, tenantId);
    const updated = await this.patch(id, tenantId, {
      status: 'approved',
      pendingApproval: null,
      completedAt: new Date(),
    });
    if (this.snapshot) {
      this.snapshot.markApproved(tenantId, session.domain).catch(() => {});
    }
    // Queue TenantContext synthesis so next session benefits from updated brain
    if (this.brainMemoryQueue) {
      this.brainMemoryQueue
        .add('synthesise_context', { tenantId }, { attempts: 2 })
        .catch(() => {});
    }
    return updated;
  }

  async reject(
    id: string,
    tenantId: string,
    reason: string,
  ): Promise<AgentSession> {
    return this.patch(id, tenantId, {
      status: 'rejected',
      lastRejection: { reason, at: new Date().toISOString() },
    });
  }

  async heartbeat(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { lastHeartbeatAt: new Date() });
  }

  async listActive(tenantId: string): Promise<AgentSession[]> {
    return this.repo.find({
      where: [
        { tenantId, status: 'running' },
        { tenantId, status: 'waiting_approval' },
        { tenantId, status: 'stalled' },
      ],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async findOrCreate(
    tenantId: string,
    domain: string,
    siteId?: string,
  ): Promise<AgentSession> {
    const existing = await this.repo.findOne({
      where: [
        { tenantId, domain, status: 'running' },
        { tenantId, domain, status: 'waiting_approval' },
      ],
    });
    if (existing) return existing;
    return this.create(tenantId, domain, siteId);
  }
}
