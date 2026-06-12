import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GlobalArchitecturalRule } from './entities/global-architectural-rule.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

export interface ArchRule {
  ruleId: string;
  domain: string;
  triggerKeywords: string[];
  minTier: number;
  maxTier: number;
  title: string;
  explanation: string;
  counterProposal: string;
  requiresVisionOverride: boolean;
}

const CACHE_KEY = 'global:architectural-rules:merged';
const CACHE_TTL = 600; // 10 minutes

@Injectable()
export class ArchitecturalRulesLoaderService implements OnModuleInit {
  private readonly logger = new Logger(ArchitecturalRulesLoaderService.name);
  private baselineRules: ArchRule[] = [];

  constructor(
    @InjectRepository(GlobalArchitecturalRule)
    private readonly repo: Repository<GlobalArchitecturalRule>,
    private readonly cache: RedisCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.baselineRules = await this.loadTsv();
    this.logger.log(
      `Loaded ${this.baselineRules.length} baseline architectural rules`,
    );
  }

  async getMergedRules(): Promise<ArchRule[]> {
    const cached = await this.cache.get<ArchRule[]>(CACHE_KEY);
    if (cached) return cached;

    const dbRules = await this.repo.find({ where: { isActive: true } });
    const merged = this.merge(this.baselineRules, dbRules);
    await this.cache.set(CACHE_KEY, merged, CACHE_TTL);
    return merged;
  }

  async invalidateCache(): Promise<void> {
    await this.cache.del(CACHE_KEY);
  }

  private merge(
    baseline: ArchRule[],
    dbRules: GlobalArchitecturalRule[],
  ): ArchRule[] {
    const map = new Map<string, ArchRule>();
    for (const r of baseline) map.set(r.ruleId, r);
    for (const r of dbRules) {
      map.set(r.ruleId, {
        ruleId: r.ruleId,
        domain: r.domain,
        triggerKeywords: r.triggerKeywords,
        minTier: r.minTier,
        maxTier: r.maxTier,
        title: r.title,
        explanation: r.explanation,
        counterProposal: r.counterProposal,
        requiresVisionOverride: r.requiresVisionOverride,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.ruleId.localeCompare(b.ruleId),
    );
  }

  private async loadTsv(): Promise<ArchRule[]> {
    const tsvPath = path.join(
      process.cwd(),
      '..',
      'memory',
      'global-architectural-rules.tsv',
    );
    try {
      const raw = await fs.readFile(tsvPath, 'utf-8');
      const lines = raw
        .split('\n')
        .filter((l) => l.trim() && !l.startsWith('rule_id'));
      return lines.map((line) => {
        const [
          ruleId,
          domain,
          keywordsRaw,
          minTier,
          maxTier,
          title,
          explanation,
          counterProposal,
          requiresVisionOverride,
        ] = line.split('\t');
        return {
          ruleId: ruleId.trim(),
          domain: domain.trim(),
          triggerKeywords: keywordsRaw.split(',').map((k) => k.trim()),
          minTier: parseInt(minTier, 10),
          maxTier: parseInt(maxTier, 10),
          title: title.trim(),
          explanation: explanation.trim(),
          counterProposal: counterProposal.trim(),
          requiresVisionOverride: requiresVisionOverride?.trim() === 'true',
        };
      });
    } catch (err) {
      this.logger.warn(
        `Could not load TSV baseline: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
