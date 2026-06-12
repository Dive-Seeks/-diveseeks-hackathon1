import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ArchitecturalRulesLoaderService,
  ArchRule,
} from './architectural-rules-loader.service';
import { ProjectTierService } from './project-tier.service';
import {
  ArchitecturalVerdict,
  VerdictOutcome,
} from './entities/architectural-verdict.entity';
import { ArchitecturalOverride } from './entities/architectural-override.entity';
import { GlobalArchitecturalRule } from './entities/global-architectural-rule.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

export interface VerdictResult {
  ruleId: string;
  domain: string;
  title: string;
  explanation: string;
  counterProposal: string;
  requiresVisionOverride: boolean;
  projectTier: string;
  overridable: true;
}

const OVERRIDE_CACHE_TTL = 3600; // 1 hour — invalidated on change

@Injectable()
export class ArchitecturalRulesEngine {
  private readonly logger = new Logger(ArchitecturalRulesEngine.name);

  constructor(
    private readonly loader: ArchitecturalRulesLoaderService,
    private readonly tierService: ProjectTierService,
    private readonly cache: RedisCacheService,
    @InjectRepository(ArchitecturalVerdict)
    private readonly verdictRepo: Repository<ArchitecturalVerdict>,
    @InjectRepository(ArchitecturalOverride)
    private readonly overrideRepo: Repository<ArchitecturalOverride>,
    @InjectRepository(GlobalArchitecturalRule)
    private readonly globalRuleRepo: Repository<GlobalArchitecturalRule>,
  ) {}

  async evaluate(
    message: string,
    projectId: string,
    tenantId: string,
    sessionId: string,
  ): Promise<VerdictResult | null> {
    const [{ tier, tierValue }, rules] = await Promise.all([
      this.tierService.getTier(projectId, tenantId),
      this.loader.getMergedRules(),
    ]);

    const lowerMsg = message.toLowerCase();
    const tierFiltered = rules.filter(
      (r) => tierValue >= r.minTier && tierValue <= r.maxTier,
    );

    const matched = tierFiltered.find((r) =>
      r.triggerKeywords.some((kw) => lowerMsg.includes(kw.toLowerCase())),
    );

    if (!matched) return null;

    const alreadyOverridden = await this.hasActiveOverride(
      projectId,
      matched.ruleId,
    );
    if (alreadyOverridden) return null;

    const outcome: VerdictOutcome = matched.requiresVisionOverride
      ? 'counter_proposed'
      : 'warned';
    await this.logVerdict(
      matched,
      projectId,
      tenantId,
      sessionId,
      tier,
      outcome,
    );

    return {
      ruleId: matched.ruleId,
      domain: matched.domain,
      title: matched.title,
      explanation: matched.explanation,
      counterProposal: matched.counterProposal,
      requiresVisionOverride: matched.requiresVisionOverride,
      projectTier: tier,
      overridable: true,
    };
  }

  async logOverride(
    projectId: string,
    tenantId: string,
    sessionId: string,
    ruleId: string,
    reason: string,
  ): Promise<ArchitecturalOverride> {
    const override = this.overrideRepo.create({
      projectId,
      tenantId,
      sessionId,
      ruleId,
      developerReason: reason,
      resolvedAt: null,
    });
    const saved = await this.overrideRepo.save(override);
    await this.globalRuleRepo
      .increment({ ruleId }, 'tenantOverrideCount', 1)
      .catch(() => {});
    // Mark active in cache — no DB lookup needed until resolved
    await this.cache.set(
      this.overrideCacheKey(projectId, ruleId),
      true,
      OVERRIDE_CACHE_TTL,
    );
    return saved;
  }

  async resolveOverride(
    overrideId: string,
    projectId: string,
    ruleId: string,
  ): Promise<void> {
    await this.cache.del(this.overrideCacheKey(projectId, ruleId));
  }

  async hasActiveOverride(projectId: string, ruleId: string): Promise<boolean> {
    const cached = await this.cache.get<boolean>(
      this.overrideCacheKey(projectId, ruleId),
    );
    if (cached !== null) return cached;

    const override = await this.overrideRepo.findOne({
      where: { projectId, ruleId, resolvedAt: null as any },
    });
    const result = !!override;
    if (result) {
      await this.cache.set(
        this.overrideCacheKey(projectId, ruleId),
        true,
        OVERRIDE_CACHE_TTL,
      );
    }
    return result;
  }

  private overrideCacheKey(projectId: string, ruleId: string): string {
    return `arch:override:${projectId}:${ruleId}`;
  }

  private async logVerdict(
    rule: ArchRule,
    projectId: string,
    tenantId: string,
    sessionId: string,
    tier: string,
    outcome: VerdictOutcome,
  ): Promise<void> {
    const verdict = this.verdictRepo.create({
      projectId,
      tenantId,
      sessionId,
      ruleId: rule.ruleId,
      domain: rule.domain,
      projectTier: tier,
      outcome,
    });
    await this.verdictRepo
      .save(verdict)
      .catch((err) =>
        this.logger.warn(`Failed to log verdict: ${(err as Error).message}`),
      );
  }
}
