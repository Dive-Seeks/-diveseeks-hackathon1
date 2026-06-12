import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SnapshotService } from '../snapshot/snapshot.service';
import { RoutingService } from '../routing.service';
import { GeneralRoutingService } from '../specialists/general/general-routing.service';
import { ResearchRoutingService } from '../specialists/research/research-routing.service';
import { SAFE_PAIRS } from '../reasoning/reasoning.types';

const COLD_START_THRESHOLD = 10;
const MIN_CONFIDENCE = 0.55;
const LOOKBACK_DAYS = 30;

export interface PredictionResult {
  primarySpecialist: string;
  alsoSpecialist: string | null;
  confidence: number;
  outcomeForecast: { pass: number; needsReview: number; fail: number };
  predictionBasis: 'learned' | 'cold_start' | 'keyword_fallback';
  rankedSpecialists: Array<{
    specialistId: string;
    score: number;
    successRate: number;
    sampleSize: number;
  }>;
}

@Injectable()
export class PredictionEngineService {
  private readonly logger = new Logger(PredictionEngineService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly snapshotService: SnapshotService,
    private readonly routingService: RoutingService,
    private readonly generalRouting: GeneralRoutingService,
    private readonly researchRouting: ResearchRoutingService,
  ) {}

  async predict(
    taskDescription: string,
    team: string,
    tenantId: string,
    specialistLoadMap: Record<string, number>,
    tenantConfigs?: Record<string, { blocked: boolean; routingBoost: number }>,
  ): Promise<PredictionResult> {
    try {
      const rows = await this.dataSource.query(
        `SELECT specialist_id, outcome, created_at
         FROM task_trajectories
         WHERE tenant_id = $1
           AND team = $2
           AND approved = true
           AND created_at > NOW() - ($3 * INTERVAL '1 day')
         ORDER BY created_at DESC
         LIMIT 500`,
        [tenantId, team, LOOKBACK_DAYS],
      );

      if (rows.length < COLD_START_THRESHOLD) {
        this.logger.warn(
          `[PredictionEngine] Cold start for tenant ${tenantId} team ${team} — only ${rows.length} trajectories (minimum ${COLD_START_THRESHOLD}). Using keyword fallback.`,
        );
        return this.keywordFallback(taskDescription, team, 'cold_start');
      }

      // Aggregate per specialist
      const stats: Record<
        string,
        { pass: number; needsReview: number; fail: number; total: number }
      > = {};
      for (const row of rows) {
        const sid = row.specialist_id as string;
        if (!stats[sid])
          stats[sid] = { pass: 0, needsReview: 0, fail: 0, total: 0 };
        stats[sid].total++;
        if (row.outcome === 'pass') stats[sid].pass++;
        else if (row.outcome === 'needs_review') stats[sid].needsReview++;
        else stats[sid].fail++;
      }

      const scored = Object.entries(stats).map(([specialistId, s]) => {
        const successRate = (s.pass + 0.5 * s.needsReview) / s.total;
        const load = specialistLoadMap[specialistId] ?? 0;
        const loadPenalty = 1 / (1 + load);
        const boost = tenantConfigs?.[specialistId]?.routingBoost ?? 1.0;
        const blocked = tenantConfigs?.[specialistId]?.blocked ?? false;
        const score = blocked ? 0 : successRate * loadPenalty * boost;

        if (blocked) {
          this.logger.warn(
            `[PredictionEngine] Specialist ${specialistId} is blocked for tenant ${tenantId} — excluded from ranking`,
          );
        }

        return { specialistId, score, successRate, sampleSize: s.total };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      // All specialists blocked or no scored entries
      if (!best || best.score === 0) {
        this.logger.warn(
          `[PredictionEngine] All specialists scored 0 for tenant ${tenantId} (blocked or no data) — using keyword fallback`,
        );
        return this.keywordFallback(taskDescription, team, 'keyword_fallback');
      }

      // Low confidence
      if (best.successRate < MIN_CONFIDENCE) {
        this.logger.warn(
          `[PredictionEngine] Low confidence (${best.successRate.toFixed(2)}) for tenant ${tenantId} — below threshold ${MIN_CONFIDENCE}. Using keyword fallback.`,
        );
        return this.keywordFallback(taskDescription, team, 'keyword_fallback');
      }

      const alsoSpecialist =
        (SAFE_PAIRS as Record<string, string | null>)[best.specialistId] ??
        null;
      const topStats = stats[best.specialistId];
      const total = topStats.total;

      const result: PredictionResult = {
        primarySpecialist: best.specialistId,
        alsoSpecialist,
        confidence: best.successRate,
        outcomeForecast: {
          pass: topStats.pass / total,
          needsReview: topStats.needsReview / total,
          fail: topStats.fail / total,
        },
        predictionBasis: 'learned',
        rankedSpecialists: scored.slice(0, 5),
      };

      this.logger.log(
        `[PredictionEngine] Predicted ${result.primarySpecialist} (confidence=${result.confidence.toFixed(2)}) for tenant ${tenantId} basis=learned sampleSize=${best.sampleSize}`,
      );

      return result;
    } catch (err) {
      this.logger.error(
        `[PredictionEngine] Failed to load trajectories for tenant ${tenantId}`,
        (err as Error).stack,
      );
      return this.keywordFallback(taskDescription, team, 'keyword_fallback');
    }
  }

  private keywordFallback(
    taskDescription: string,
    team: string,
    basis: 'cold_start' | 'keyword_fallback',
  ): PredictionResult {
    let specialist: string;
    if (team === 'general') {
      specialist = this.generalRouting.route(taskDescription);
    } else if (team === 'research') {
      specialist = this.researchRouting.route(taskDescription);
    } else {
      const routing = this.routingService.mapIntent(taskDescription);
      specialist = routing.specialist;
    }

    return {
      primarySpecialist: specialist,
      alsoSpecialist:
        (SAFE_PAIRS as Record<string, string | null>)[specialist] ?? null,
      confidence: 0,
      outcomeForecast: { pass: 0.5, needsReview: 0.25, fail: 0.25 },
      predictionBasis: basis,
      rankedSpecialists: [
        { specialistId: specialist, score: 0, successRate: 0, sampleSize: 0 },
      ],
    };
  }
}
