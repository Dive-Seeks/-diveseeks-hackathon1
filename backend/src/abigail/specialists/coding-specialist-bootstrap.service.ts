import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

const CODING_SPECIALISTS = [
  'rex',
  'nova',
  'kai',
  'sage',
  'atlas',
  'orion',
  'pixel',
  'luma',
  'felix',
  'vex',
] as const;

type CodingSpecialistId = (typeof CODING_SPECIALISTS)[number];

@Injectable()
export class CodingSpecialistBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(CodingSpecialistBootstrapService.name);
  private readonly agentIdMap = new Map<string, string>();

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  async onModuleInit() {
    for (const name of CODING_SPECIALISTS) {
      let agent = await this.agentRepo.findOne({
        where: { name, role: 'specialist' },
      });

      if (!agent) {
        agent = this.agentRepo.create({
          name,
          role: 'specialist',
          domain: 'coding',
          status: 'active',
          tenantId: null,
        });
        agent = await this.agentRepo.save(agent);
        this.logger.log(
          `Bootstrapped coding specialist agent: ${name} (${agent.id})`,
        );
      }

      this.agentIdMap.set(name, agent.id);
    }
  }

  registerAgentId(name: string, id: string): void {
    this.agentIdMap.set(name, id);
  }

  getAgentId(specialistName: string): string {
    const id = this.agentIdMap.get(specialistName);
    if (!id) {
      throw new Error(`Coding specialist '${specialistName}' not bootstrapped`);
    }
    return id;
  }
}
