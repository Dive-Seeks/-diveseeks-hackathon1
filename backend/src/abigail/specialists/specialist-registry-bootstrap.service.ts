import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { CodingSpecialistBootstrapService } from './coding-specialist-bootstrap.service';
import { SpecialistRegistryService } from './specialist-registry.service';
import {
  EchoSpecialist,
  LyraSpecialist,
  SparkSpecialist,
  ZoeSpecialist,
  GistSpecialist,
  MemoSpecialist,
  TranSpecialist,
  PlanSpecialist,
  VibeSpecialist,
  QuestSpecialist,
} from './general/general-specialists';

const GENERAL_SPECIALISTS = [
  'echo',
  'lyra',
  'spark',
  'zoe',
  'gist',
  'memo',
  'tran',
  'plan',
  'vibe',
  'quest',
] as const;

@Injectable()
export class SpecialistRegistryBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SpecialistRegistryBootstrapService.name);
  private readonly agentIdMap = new Map<string, string>();

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly codingBootstrap: CodingSpecialistBootstrapService,
    private readonly registry: SpecialistRegistryService,
    private readonly echo: EchoSpecialist,
    private readonly lyra: LyraSpecialist,
    private readonly spark: SparkSpecialist,
    private readonly zoe: ZoeSpecialist,
    private readonly gist: GistSpecialist,
    private readonly memo: MemoSpecialist,
    private readonly tran: TranSpecialist,
    private readonly plan: PlanSpecialist,
    private readonly vibe: VibeSpecialist,
    private readonly quest: QuestSpecialist,
  ) {}

  async onModuleInit() {
    const specialists = [
      this.echo,
      this.lyra,
      this.spark,
      this.zoe,
      this.gist,
      this.memo,
      this.tran,
      this.plan,
      this.vibe,
      this.quest,
    ];

    for (const specialist of specialists) {
      if (specialist) {
        this.registry.register('general', specialist);
      }
    }

    for (const name of GENERAL_SPECIALISTS) {
      let agent = await this.agentRepo.findOne({
        where: { name, role: 'specialist' },
      });

      if (!agent) {
        agent = this.agentRepo.create({
          name,
          role: 'specialist',
          domain: 'general',
          status: 'active',
          tenantId: null,
        });
        agent = await this.agentRepo.save(agent);
        this.logger.log(
          `Bootstrapped general specialist: ${name} (${agent.id})`,
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
        `General specialist '${specialistName}' not bootstrapped`,
      );
    }
    return id;
  }
}
