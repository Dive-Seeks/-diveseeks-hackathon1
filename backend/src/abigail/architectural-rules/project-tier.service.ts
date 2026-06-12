import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectTier,
  ProjectTierLevel,
  TIER_VALUES,
} from './entities/project-tier.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { DeclareProjectTierDto } from './dto/declare-project-tier.dto';

export interface TierResult {
  tier: ProjectTierLevel;
  tierValue: number;
}

const TIER_ORDER: ProjectTierLevel[] = [
  'solo',
  'startup',
  'scaleup',
  'enterprise',
];

function teamSizeToTier(teamSize: number): ProjectTierLevel {
  if (teamSize === 1) return 'solo';
  if (teamSize <= 5) return 'startup';
  if (teamSize <= 20) return 'scaleup';
  return 'enterprise';
}

@Injectable()
export class ProjectTierService {
  private readonly logger = new Logger(ProjectTierService.name);
  private readonly TTL = 3600;

  constructor(
    @InjectRepository(ProjectTier)
    private readonly repo: Repository<ProjectTier>,
    private readonly cache: RedisCacheService,
  ) {}

  private cacheKey(projectId: string, tenantId: string): string {
    return `tenant:${tenantId}:project:${projectId}:tier`;
  }

  async declareTier(
    projectId: string,
    tenantId: string,
    dto: DeclareProjectTierDto,
  ): Promise<ProjectTier> {
    const tier = teamSizeToTier(dto.teamSize);
    const existing = await this.repo.findOne({
      where: { projectId, tenantId },
    });
    if (existing) {
      existing.tier = tier;
      existing.teamSize = dto.teamSize;
      existing.projectType = dto.projectType;
      existing.lifetime = dto.lifetime;
      const saved = await this.repo.save(existing);
      await this.cache.del(this.cacheKey(projectId, tenantId));
      return saved;
    }
    const record = this.repo.create({
      projectId,
      tenantId,
      tier,
      teamSize: dto.teamSize,
      projectType: dto.projectType,
      lifetime: dto.lifetime,
    });
    const saved = await this.repo.save(record);
    await this.cache.del(this.cacheKey(projectId, tenantId));
    return saved;
  }

  async getTier(projectId: string, tenantId: string): Promise<TierResult> {
    const key = this.cacheKey(projectId, tenantId);
    const cached = await this.cache.get<TierResult>(key);
    if (cached) return cached;
    const record = await this.repo.findOne({ where: { projectId, tenantId } });
    const tier: ProjectTierLevel = record?.tier ?? 'solo';
    const result: TierResult = { tier, tierValue: TIER_VALUES[tier] };
    await this.cache.set(key, result, this.TTL);
    return result;
  }

  async promote(projectId: string, tenantId: string): Promise<ProjectTier> {
    const record = await this.repo.findOne({ where: { projectId, tenantId } });
    const current: ProjectTierLevel = record?.tier ?? 'solo';
    const currentIndex = TIER_ORDER.indexOf(current);
    if (currentIndex >= TIER_ORDER.length - 1) {
      throw new BadRequestException('Already at maximum tier');
    }
    const nextTier = TIER_ORDER[currentIndex + 1];
    const target =
      record ??
      this.repo.create({
        projectId,
        tenantId,
        teamSize: 1,
        projectType: 'greenfield',
        lifetime: 'long-term',
      });
    target.tier = nextTier;
    target.autoPromoted = true;
    target.promotedAt = new Date();
    const saved = await this.repo.save(target);
    await this.cache.del(this.cacheKey(projectId, tenantId));
    return saved;
  }
}
