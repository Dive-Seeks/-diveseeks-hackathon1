import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ParametricWeight } from '../memory/entities/parametric-weight.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { AuditFinding } from '../audit-loop/entities/audit-loop.entity';
import { TaskSession } from './entities/task-session.entity';
import { VisionService } from '../tce/vision/vision.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { SpecKitEntryService } from '../data-engine';
import { ProjectCardService } from './project-card.service';
import type { ProjectCompletionCard } from './project-lifecycle.types';

export interface ProjectContext {
  projectId: string;
  projectCard: ProjectCompletionCard;
  vision: unknown;
  weights: Array<{ rule: string; confidence: number }>;
  recentEpisodes: Array<{ summary: string; episodeType: string }>;
  openFindings: Array<{
    criterion: string;
    severity: string;
    evidence: string;
  }>;
  recentSessions: Array<{ id: string; status: string; specialist: string }>;
  assembledAt: string;
  specKit: {
    constitution: string | null;
    spec: string | null;
    plan: string | null;
    tasks: string | null;
  };
}

@Injectable()
export class ProjectContextService {
  private readonly logger = new Logger(ProjectContextService.name);
  private readonly CACHE_TTL = 60;

  constructor(
    private readonly visionService: VisionService,
    @InjectRepository(ParametricWeight)
    private readonly weightRepo: Repository<ParametricWeight>,
    @InjectRepository(AgentEpisode)
    private readonly episodeRepo: Repository<AgentEpisode>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    private readonly cache: RedisCacheService,
    private readonly specKit: SpecKitEntryService,
    private readonly projectCardService: ProjectCardService,
  ) {}

  async getProjectContext(
    projectId: string,
    tenantId: string,
  ): Promise<ProjectContext> {
    const cacheKey = `pic:project-context:${tenantId}:${projectId}`;
    const cached = await this.cache.get<ProjectContext>(cacheKey);
    if (cached) return cached;

    const vision = await this.visionService
      .getVision(projectId)
      .catch(() => null);

    const weights = await this.weightRepo.find({
      where: { tenantId, archived: false },
      order: { confidence: 'DESC' },
      take: 20,
    });

    const recentEpisodes = await this.episodeRepo.find({
      where: { tenantId, domain: 'coding' },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const openFindings = await this.findingRepo.find({
      where: { tenantId, severity: In(['medium', 'high', 'critical']) },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentSessions = await this.sessionRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const [constitution, spec, plan, tasks, projectCard] = await Promise.all([
      this.specKit.read(projectId, 'memory/constitution.md'),
      this.specKit.read(projectId, 'specs/current/spec.md'),
      this.specKit.read(projectId, 'specs/current/plan.md'),
      this.specKit.read(projectId, 'specs/current/tasks.md'),
      this.projectCardService.build(tenantId, projectId),
    ]);

    const context: ProjectContext = {
      projectId,
      projectCard,
      vision,
      weights: weights.map((w) => ({
        rule: w.rule,
        confidence: Number(w.confidence),
      })),
      recentEpisodes: recentEpisodes.map((e) => ({
        summary: e.summary,
        episodeType: e.episodeType,
      })),
      openFindings: openFindings.map((f) => ({
        criterion: f.criterion,
        severity: f.severity,
        evidence: f.evidence,
      })),
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        status: s.status,
        specialist: s.specialist,
      })),
      assembledAt: new Date().toISOString(),
      specKit: { constitution, spec, plan, tasks },
    };

    await this.cache.set(cacheKey, context, this.CACHE_TTL);
    return context;
  }
}
