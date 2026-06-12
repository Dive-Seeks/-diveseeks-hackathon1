import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgentIssue } from './entities/agent-issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    @InjectRepository(AgentIssue)
    private readonly issueRepo: Repository<AgentIssue>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateIssueDto): Promise<AgentIssue> {
    const issue = this.issueRepo.create({
      tenantId: dto.tenantId,
      title: dto.title,
      description: dto.description ?? null,
      assigneeAgentId: dto.assigneeAgentId,
      sessionId: dto.sessionId ?? null,
      domain: dto.domain ?? null,
      priority: dto.priority ?? null,
      goalAncestry: dto.goalAncestry ?? null,
      constraints: dto.constraints ?? null,
      parentIssueId: dto.parentIssueId ?? null,
      originKind: (dto.originKind as any) ?? null,
      status: 'todo',
    });
    return this.issueRepo.save(issue);
  }

  async createForSession(
    sessionId: string,
    tenantId: string,
    assigneeAgentId: string,
    title: string,
    goalAncestry?: Record<string, any> | null,
  ): Promise<AgentIssue> {
    const issue = this.issueRepo.create({
      id: sessionId,
      tenantId,
      title,
      assigneeAgentId,
      sessionId,
      status: 'assigned',
      originKind: 'chat',
      goalAncestry: goalAncestry ?? null,
    });
    return this.issueRepo.save(issue);
  }

  async findAll(
    tenantId?: string,
    agentId?: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: AgentIssue[]; total: number }> {
    const where: Record<string, any> = {};
    if (tenantId) where.tenantId = tenantId;
    if (agentId) where.assigneeAgentId = agentId;
    if (status) where.status = status;

    const [data, total] = await this.issueRepo.findAndCount({
      where,
      relations: ['assigneeAgent'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });

    return { data, total };
  }

  async findOne(id: string): Promise<AgentIssue> {
    const issue = await this.issueRepo.findOne({
      where: { id },
      relations: ['assigneeAgent', 'parentIssue'],
    });
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  async update(id: string, dto: UpdateIssueDto): Promise<AgentIssue> {
    const issue = await this.findOne(id);
    Object.assign(issue, dto);
    return this.issueRepo.save(issue);
  }

  /**
   * Atomic checkout — Paperclip's core pattern.
   * Uses a DB transaction to prevent concurrent checkout of the same issue.
   */
  async checkoutIssueForAgent(
    issueId: string,
    agentId: string,
  ): Promise<{ issue: AgentIssue; runId: string }> {
    const runId = randomUUID();

    return this.dataSource.transaction(async (manager) => {
      const issue = await manager.findOne(AgentIssue, {
        where: { id: issueId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!issue) {
        throw new NotFoundException(`Issue ${issueId} not found`);
      }

      if (!['todo', 'assigned'].includes(issue.status)) {
        throw new ConflictException(
          `Issue ${issueId} cannot be checked out (status: ${issue.status})`,
        );
      }

      if (issue.assigneeAgentId !== agentId) {
        throw new ConflictException(
          `Issue ${issueId} is not assigned to agent ${agentId}`,
        );
      }

      issue.status = 'in_progress';
      issue.checkoutRunId = runId;
      issue.executionLockedAt = new Date();

      await manager.save(AgentIssue, issue);

      this.logger.log(
        `Issue ${issueId} checked out by agent ${agentId}, runId: ${runId}`,
      );

      return { issue, runId };
    });
  }

  /**
   * Release the issue lock after execution completes.
   */
  async releaseIssue(issueId: string): Promise<AgentIssue> {
    const issue = await this.findOne(issueId);
    issue.status = 'assigned';
    issue.executionLockedAt = null;
    issue.checkoutRunId = null;
    return this.issueRepo.save(issue);
  }
}
