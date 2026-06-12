import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { TsvLoaderUtil } from './tsv-loader.util';

export type GrowthPhase = 'foundation' | 'acceleration' | 'dominance';

export interface DomainGrowthStatus {
  domain: string;
  score: number; // 0–100
  weight: number; // e.g. 0.20
  contribution: number; // score * weight
  phase: GrowthPhase;
  nextAction: string;
}

export interface GrowthReport {
  compositeScore: number; // sum of contributions, 0–100 scale
  phase: GrowthPhase;
  phaseBadge: string; // 'Foundation' | 'Acceleration' | 'Dominance'
  progressPct: number; // 0–100 toward 2000% (composite/200 * 100)
  domains: DomainGrowthStatus[];
  priorityDomain: string; // lowest-score domain → run this specialist tonight
  adBudgetSet: boolean;
  strategyPreset: string;
}

const BASE_DIR = process.cwd().endsWith('backend')
  ? path.resolve(process.cwd(), 'src/jos/rules')
  : path.resolve(process.cwd(), 'backend/src/jos/rules');

const GROWTH_RULES_BY_TYPE: Record<string, string> = {
  RESTAURANT: path.join(BASE_DIR, 'restaurant/growth-phase-rules.tsv'),
  RETAIL: path.join(BASE_DIR, 'retail/growth-phase-rules.tsv'),
  ECOMMERCE: path.join(BASE_DIR, 'ecommerce/growth-phase-rules.tsv'),
};
const DEFAULT_RULES_PATH = GROWTH_RULES_BY_TYPE['RESTAURANT'];

const PHASE_THRESHOLDS = { foundation: 30, acceleration: 70 };

@Injectable()
export class GrowthEngineService {
  private readonly logger = new Logger(GrowthEngineService.name);

  async computeReport(
    snapshot: Record<string, string>[],
    adBudgetSet: boolean,
    businessType = 'RESTAURANT',
    strategyPreset = 'balanced',
  ): Promise<GrowthReport> {
    const rulesPath = GROWTH_RULES_BY_TYPE[businessType] ?? DEFAULT_RULES_PATH;
    const rules = await TsvLoaderUtil.readTsv(rulesPath);
    const ruleMap = Object.fromEntries(rules.map((r) => [r.domain, r]));

    let composite = 0;
    const domains: DomainGrowthStatus[] = [];

    for (const row of snapshot) {
      const rule = ruleMap[row.domain];
      if (!rule) continue;
      const score = parseFloat(row.score ?? '0');
      const weight = parseFloat(rule.weight) / 100;
      const contribution = score * weight;
      composite += contribution;

      const domainPhase = this.domainPhase(score);
      domains.push({
        domain: row.domain,
        score,
        weight,
        contribution,
        phase: domainPhase,
        nextAction: rule.onboard_intent,
      });
    }

    const roundedComposite = Math.round(composite);
    const phase = this.overallPhase(roundedComposite);
    const phaseBadge =
      phase === 'foundation'
        ? 'Foundation'
        : phase === 'acceleration'
          ? 'Acceleration'
          : 'Dominance';

    // Progress toward 2000%: composite starts ~10, target is 200 (20× = 2000%)
    // We express composite on 0–100 scale; 2000% means 20× original score
    // progressPct = Math.min(100, (composite / 100) * 100) gives a clean 0–100% bar
    const progressPct = Math.min(100, roundedComposite);

    // Priority: lowest-scoring domain that hasn't hit its phase target
    const priorityDomain = domains.reduce(
      (worst, d) => (d.score < worst.score ? d : worst),
      domains[0] ?? { domain: 'menu', score: 100 },
    ).domain;

    this.logger.log(
      `Growth report: composite=${roundedComposite} phase=${phase} priority=${priorityDomain}`,
    );

    return {
      compositeScore: roundedComposite,
      phase,
      phaseBadge,
      progressPct,
      domains,
      priorityDomain,
      adBudgetSet,
      strategyPreset,
    };
  }

  /** Determine the current overall phase from composite score */
  private overallPhase(composite: number): GrowthPhase {
    if (composite < PHASE_THRESHOLDS.foundation) return 'foundation';
    if (composite < PHASE_THRESHOLDS.acceleration) return 'acceleration';
    return 'dominance';
  }

  /** Determine phase for a single domain score */
  private domainPhase(score: number): GrowthPhase {
    if (score < PHASE_THRESHOLDS.foundation) return 'foundation';
    if (score < PHASE_THRESHOLDS.acceleration) return 'acceleration';
    return 'dominance';
  }

  /** Score increment to apply to a domain after a tenant approves specialist output */
  domainScoreIncrement(domain: string, currentScore: number): number {
    // Each approval in Foundation adds 15 pts; Acceleration adds 8; Dominance adds 3
    const phase = this.domainPhase(currentScore);
    if (phase === 'foundation') return 15;
    if (phase === 'acceleration') return 8;
    return 3;
  }
}
