import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, Or, Equal } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { HireAgentDto } from './dto/hire-agent.dto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  async create(dto: CreateAgentDto): Promise<Agent> {
    // Block HTTP from ever creating a global-ceo
    if (dto.role === 'global-ceo') {
      throw new BadRequestException(
        'global-ceo is a platform singleton — cannot be created via API',
      );
    }

    // Block HTTP from creating a duplicate industry-ceo for same industry
    if (dto.role === 'industry-ceo' && dto.industry) {
      const existing = await this.agentRepo.findOne({
        where: { role: 'industry-ceo', industry: dto.industry },
      });
      if (existing) {
        throw new BadRequestException(
          `industry-ceo for '${dto.industry}' already exists`,
        );
      }
    }

    if (dto.reportsToId) {
      await this.assertNoCycle(dto.reportsToId, null);
    }

    const agent = this.agentRepo.create({
      ...dto,
      status: 'idle',
      hiredAt: new Date(),
    });

    return this.agentRepo.save(agent);
  }

  async findAll(tenantId?: string): Promise<Agent[]> {
    const where: Record<string, any> = {};
    if (tenantId) where.tenantId = tenantId;

    return this.agentRepo.find({
      where,
      relations: ['reportsTo'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id },
      relations: ['reportsTo'],
    });
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return agent;
  }

  async findByNameAndRole(name: string, role: string): Promise<Agent | null> {
    return this.agentRepo.findOne({ where: { name, role } });
  }

  async isCoordinatorNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.agentRepo
      .createQueryBuilder('agent')
      .where('agent.role = :role', { role: 'coordinator' })
      .andWhere('LOWER(agent.name) = LOWER(:name)', { name });
    if (excludeId) {
      qb.andWhere('agent.id != :excludeId', { excludeId });
    }
    const existing = await qb.getOne();
    return existing === null;
  }

  async findCoordinatorForTenant(
    tenantId: string | null,
  ): Promise<Agent | null> {
    const qb = this.agentRepo
      .createQueryBuilder('agent')
      .where('agent.role = :role', { role: 'coordinator' })
      .orderBy('agent.createdAt', 'ASC')
      .limit(1);

    if (tenantId) {
      qb.andWhere('agent.tenantId = :tenantId', { tenantId });
    } else {
      qb.andWhere('agent.tenantId IS NULL');
    }

    return qb.getOne();
  }

  async getCoordinatorScope(tenantId: string | null): Promise<Agent[]> {
    const coordinator = await this.findCoordinatorForTenant(tenantId);
    this.logger.log(
      `[getCoordinatorScope] tenantId=${tenantId} coordinator=${coordinator ? `id=${coordinator.id} name=${coordinator.name} tenantId=${coordinator.tenantId}` : 'null'}`,
    );
    if (!coordinator) return [];

    const result: Agent[] = [coordinator];
    const visited = new Set<string>([coordinator.id]);
    const queue: string[] = [coordinator.id];

    // When tenantId is null, match agents that are also null-tenant
    const tenantFilter = tenantId ? Or(Equal(tenantId), IsNull()) : IsNull();

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.agentRepo.find({
        where: {
          reportsToId: parentId,
          tenantId: tenantFilter,
        },
        order: { createdAt: 'ASC' },
      });
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child);
        queue.push(child.id);
      }
    }

    return result;
  }

  async update(
    id: string,
    tenantId: string,
    dto: Partial<Agent>,
  ): Promise<Agent> {
    const agent = await this.findOne(id);

    this.logger.log(
      `[update] agentId=${id} agent.tenantId=${agent.tenantId} req.tenantId=${tenantId} dto=${JSON.stringify(dto)}`,
    );

    // Platform singletons (global-ceo, industry-ceo) have tenantId = null — they cannot be updated via tenant API
    if (agent.tenantId !== tenantId) {
      this.logger.warn(
        `[update] FORBIDDEN: agent.tenantId=${agent.tenantId} !== req.tenantId=${tenantId}`,
      );
      throw new ForbiddenException(
        'You do not have permission to update this agent',
      );
    }

    if (dto.reportsToId && dto.reportsToId !== agent.reportsToId) {
      await this.assertNoCycle(dto.reportsToId, id);
    }

    if (dto.status === 'terminated') {
      (dto as any).terminatedAt = new Date();
    }

    Object.assign(agent, dto);
    return this.agentRepo.save(agent);
  }

  async findGlobalCeo(): Promise<Agent | null> {
    return this.agentRepo.findOne({ where: { role: 'global-ceo' } });
  }

  async getOrgChart(): Promise<Agent[]> {
    return this.agentRepo.find({
      where: { status: Not('terminated') as any },
      relations: ['reportsTo'],
      order: { createdAt: 'ASC' },
    });
  }

  async getDirectReports(agentId: string): Promise<Agent[]> {
    return this.agentRepo.find({
      where: { reportsToId: agentId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Prevents circular reporting chains.
   * Walk up the reportsTo chain from `parentId`.
   * If we find `childId`, that would create a cycle.
   */
  async assertNoCycle(parentId: string, childId: string | null): Promise<void> {
    if (!childId) return;

    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === childId) {
        throw new BadRequestException(
          'Circular reporting chain detected. Cannot assign this reportsTo.',
        );
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = await this.agentRepo.findOne({
        where: { id: currentId },
        select: ['id', 'reportsToId'],
      });
      currentId = parent?.reportsToId ?? null;
    }
  }

  async hire(dto: HireAgentDto, hiredByAgentId: string): Promise<Agent> {
    if (dto.reportsToId) {
      await this.assertNoCycle(dto.reportsToId, null);
    }

    const agent = this.agentRepo.create({
      name: dto.name,
      role: dto.role,
      title: dto.title,
      reportsToId: dto.reportsToId,
      tenantId: dto.tenantId ?? null,
      industry: dto.industry ?? null,
      domain: dto.domain,
      skillPath: dto.skillPath,
      budgetMonthlyCents: dto.budgetMonthlyCents ?? 0,
      status: 'idle',
      hiredByAgentId,
      hiredAt: new Date(),
    });

    const saved = await this.agentRepo.save(agent);
    this.logger.log(
      `Agent hired: ${saved.name} (${saved.role}) by ${hiredByAgentId}`,
    );
    return saved;
  }

  async terminate(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.status = 'terminated';
    (agent as any).terminatedAt = new Date();
    return this.agentRepo.save(agent);
  }

  async findCustomAgents(tenantId: string, team?: string): Promise<Agent[]> {
    // Note: Agent entity has no `team` column — team filter is not yet applicable.
    // `domain` is the closest descriptor field; filter by it once a team→domain
    // mapping is established.
    return this.agentRepo.find({
      where: {
        tenantId,
        role: 'specialist',
      },
      select: ['id', 'name', 'domain', 'tenantId', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
  }
}
