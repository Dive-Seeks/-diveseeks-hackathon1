import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AgentSkill } from '../workforce/skills/skill.entity';

@Injectable()
export class PlatformSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformSeedService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(AgentSkill)
    private readonly skillRepo: Repository<AgentSkill>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedGlobalCeo();
    await this.seedGlobalSkills();
  }

  async seedGlobalSkills(): Promise<void> {
    const skills = [
      { skillName: 'general-prd-discipline', domain: 'general' },
      { skillName: 'research-prd-discipline', domain: 'research' },
    ];

    for (const { skillName, domain } of skills) {
      const existing = await this.skillRepo.findOne({
        where: { tenantId: null as any, skillName },
      });
      if (existing) {
        this.logger.debug(`Global skill already seeded: ${skillName}`);
        continue;
      }
      const skill = this.skillRepo.create({
        skillName,
        domain,
        targetRoles: [],
        active: true,
        tenantId: null,
      });
      await this.skillRepo.save(skill);
      this.logger.log(`Global skill seeded: ${skillName}`);
    }
  }

  async seedGlobalCeo(): Promise<Agent> {
    const existing = await this.agentRepo.findOne({
      where: { role: 'global-ceo' },
    });
    if (existing) {
      this.logger.debug(`Global CEO already exists: ${existing.id}`);
      return existing;
    }

    const abigail = this.agentRepo.create({
      name: 'Abigail',
      role: 'global-ceo',
      title: 'Global CEO — DiveSeeks AI Framework',
      domain: 'platform',
      tenantId: null,
      reportsToId: null,
      status: 'active',
      budgetMonthlyCents: 0,
    });

    const saved = await this.agentRepo.save(abigail);
    this.logger.log(`Global CEO seeded: Abigail (${saved.id})`);
    return saved;
  }
}
