import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { CodingSpecialistBootstrapService } from './coding-specialist-bootstrap.service';
import { SpecialistRegistryService } from './specialist-registry.service';
import {
  LitSpecialist,
  CiteSpecialist,
  HypoSpecialist,
  PeerSpecialist,
  ScribeSpecialist,
  TutorSpecialist,
  ProfSpecialist,
  GrantSpecialist,
  DataSpecialist,
  SynthSpecialist,
} from './research/research-specialists';

const RESEARCH_SPECIALISTS = [
  'lit',
  'cite',
  'hypo',
  'peer',
  'scribe',
  'tutor',
  'prof',
  'grant',
  'data',
  'synth',
] as const;

@Injectable()
export class ResearchRegistryBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ResearchRegistryBootstrapService.name);
  private readonly agentIdMap = new Map<string, string>();

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly codingBootstrap: CodingSpecialistBootstrapService,
    private readonly registry: SpecialistRegistryService,
    private readonly lit: LitSpecialist,
    private readonly cite: CiteSpecialist,
    private readonly hypo: HypoSpecialist,
    private readonly peer: PeerSpecialist,
    private readonly scribe: ScribeSpecialist,
    private readonly tutor: TutorSpecialist,
    private readonly prof: ProfSpecialist,
    private readonly grant: GrantSpecialist,
    private readonly data: DataSpecialist,
    private readonly synth: SynthSpecialist,
  ) {}

  async onModuleInit() {
    const specialists = [
      this.lit,
      this.cite,
      this.hypo,
      this.peer,
      this.scribe,
      this.tutor,
      this.prof,
      this.grant,
      this.data,
      this.synth,
    ];

    for (const specialist of specialists) {
      if (specialist) {
        this.registry.register('research', specialist);
      }
    }

    for (const name of RESEARCH_SPECIALISTS) {
      let agent = await this.agentRepo.findOne({
        where: { name, role: 'specialist' },
      });

      if (!agent) {
        agent = this.agentRepo.create({
          name,
          role: 'specialist',
          domain: 'research',
          status: 'active',
          tenantId: null,
        });
        agent = await this.agentRepo.save(agent);
        this.logger.log(
          `Bootstrapped research specialist: ${name} (${agent.id})`,
        );
      }

      this.agentIdMap.set(name, agent.id);
      if (
        this.codingBootstrap &&
        typeof this.codingBootstrap.registerAgentId === 'function'
      ) {
        this.codingBootstrap.registerAgentId(name, agent.id);
      }
    }
  }

  getAgentId(specialistName: string): string {
    const id = this.agentIdMap.get(specialistName);
    if (!id) {
      throw new Error(
        `Research specialist '${specialistName}' not bootstrapped`,
      );
    }
    return id;
  }
}
