import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentHeartbeatRun } from './entities/agent-heartbeat-run.entity';
import { CreateRunDto } from './dto/create-run.dto';

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);

  constructor(
    @InjectRepository(AgentHeartbeatRun)
    private readonly runRepo: Repository<AgentHeartbeatRun>,
  ) {}

  async create(dto: CreateRunDto): Promise<AgentHeartbeatRun> {
    const run = this.runRepo.create({
      ...dto,
      attempt: dto.attempt ?? 1,
      status: 'running',
      startedAt: new Date(),
    });
    return this.runRepo.save(run);
  }

  async findOne(id: string): Promise<AgentHeartbeatRun> {
    const run = await this.runRepo.findOne({
      where: { id },
      relations: ['agent', 'issue'],
    });
    if (!run) throw new NotFoundException(`Run ${id} not found`);
    return run;
  }

  async findByIssue(issueId: string): Promise<AgentHeartbeatRun[]> {
    return this.runRepo.find({
      where: { issueId },
      order: { startedAt: 'DESC' },
    });
  }

  async findByAgent(
    agentId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: AgentHeartbeatRun[]; total: number }> {
    const [data, total] = await this.runRepo.findAndCount({
      where: { agentId },
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
    return { data, total };
  }

  async complete(
    id: string,
    result: {
      status: string;
      inputTokens?: number;
      outputTokens?: number;
      costUsd?: number;
      error?: string;
      excerptOutput?: string;
    },
  ): Promise<AgentHeartbeatRun> {
    const run = await this.findOne(id);
    Object.assign(run, {
      ...result,
      completedAt: new Date(),
    });
    return this.runRepo.save(run);
  }
}
