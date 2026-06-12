import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { toSql } from 'pgvector';
import { TaskPrdFeatureMap } from './entities/task-prd-feature-map.entity';
import { TaskPrdRequirement } from './entities/task-prd-requirement.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { TrajectoryWriterService } from '../evolve/trajectory-writer.service';

/**
 * Closes the v5.0 memory loop:
 *
 *   PHASE 1 (write side) — bridgeFeatureMap(featureMap, session)
 *     After LoopOrchestrator finishes, walk task_prd_requirements and write
 *     one AgentEpisode per requirement that flipped (failed earlier, passed
 *     later) or per requirement that stayed failed. Embed once. This gives
 *     ParametricCompressionService typed, structured learning signal —
 *     instead of one vague text blob per session.
 *
 *   PHASE 2 (read side) — getPriorFailures(team, specialist, taskText, topK)
 *     Called by PrdGeneratorService before AiProviderRouter. Returns the
 *     top-K most semantically similar prior failures so the LLM can
 *     generate sharper PRDs that anticipate historically hard requirements.
 *
 * No new tables. No new MCP surface. Uses existing AgentEpisode +
 * VertexEmbeddingService + pgvector cosine.
 */
@Injectable()
export class PrdMemoryBridgeService {
  private readonly logger = new Logger(PrdMemoryBridgeService.name);

  constructor(
    @InjectRepository(TaskPrdFeatureMap)
    private readonly mapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(TaskPrdRequirement)
    private readonly reqRepo: Repository<TaskPrdRequirement>,
    @InjectRepository(AgentEpisode)
    private readonly episodeRepo: Repository<AgentEpisode>,
    private readonly vertexEmbed: VertexEmbeddingService,
    private readonly dataSource: DataSource,
    private readonly trajectoryWriter: TrajectoryWriterService,
  ) {}

  // =========================================================================
  // PHASE 1 — Write side
  // =========================================================================

  /**
   * Walks every requirement in the feature map's history (all iterations),
   * groups by requirementId, and writes one episode per noteworthy outcome:
   *
   *   - flipped (fail -> pass in later iteration)  -> episodeType: 'pattern'
   *   - final fail (never passed)                   -> episodeType: 'correction'
   *   - human_pass after fail                       -> episodeType: 'correction'
   *
   * Skipped: requirements that passed on iteration 1 (no learning signal).
   *
   * Safe to call multiple times — idempotent guard checks for an existing
   * episode keyed on (tenantId, ownerId, featureMapId+requirementId).
   */
  async bridgeFeatureMap(
    featureMap: TaskPrdFeatureMap,
    session: TaskSession,
  ): Promise<{ written: number; skipped: number }> {
    const rows = await this.reqRepo.find({
      where: { featureMapId: featureMap.id },
      order: { requirementId: 'ASC', iterationNumber: 'ASC' },
    });

    const byReq = new Map<string, TaskPrdRequirement[]>();
    for (const r of rows) {
      const list = byReq.get(r.requirementId) ?? [];
      list.push(r);
      byReq.set(r.requirementId, list);
    }

    let written = 0;
    let skipped = 0;

    for (const [requirementId, history] of byReq.entries()) {
      const outcome = this.classifyOutcome(history);
      if (outcome === null) {
        skipped++;
        continue;
      }

      // Idempotency: skip if we already bridged this requirement
      const alreadyBridged = await this.dataSource.query(
        `SELECT 1 FROM agent_episodes
         WHERE tenant_id = $1
           AND owner_id = $2
           AND summary LIKE $3
         LIMIT 1`,
        [
          session.teamId,
          session.specialist,
          `%[prd:${featureMap.id}:${requirementId}]%`,
        ],
      );
      if (alreadyBridged.length > 0) {
        skipped++;
        continue;
      }

      const last = history[history.length - 1];
      const firstFail = history.find((h) => !h.satisfied);
      const summaryText = this.buildSummary(
        featureMap,
        requirementId,
        outcome,
        firstFail,
        last,
      );

      let embedding: number[] | null = null;
      try {
        embedding = await this.vertexEmbed.embed(summaryText);
      } catch (e) {
        this.logger.warn(
          `Vertex embed failed for ${featureMap.id}/${requirementId}: ${(e as Error).message}`,
        );
      }

      const episodeType = outcome === 'flipped' ? 'pattern' : 'correction';
      const episode = this.episodeRepo.create({
        tenantId: session.teamId,
        domain: session.team || 'coding',
        ownerType: 'agent',
        ownerId: session.specialist,
        episodeType,
        keywords: this.buildKeywords(featureMap, last),
        summary: summaryText,
        embedding,
        // pattern episodes immediately qualify for parametric compression
        // (matches DataEngineParametricBridge pattern — correction stays at 0)
        useCount: episodeType === 'pattern' ? 3 : 0,
      });
      await this.episodeRepo.save(episode);
      written++;
    }

    this.logger.log(
      `[PrdMemoryBridge] featureMap=${featureMap.id} wrote ${written} episodes, skipped ${skipped}`,
    );

    const trajectoryOutcome: 'pass' | 'fail' | 'needs_review' =
      featureMap.status === 'complete'
        ? 'pass'
        : featureMap.status === 'human_review'
          ? 'needs_review'
          : 'fail';

    const predictionMeta = (session.context as any)?.predictionMeta;

    await this.trajectoryWriter
      .write({
        tenantId: session.teamId,
        specialistId: session.specialist,
        team: session.team ?? 'coding',
        taskDescription: session.taskDescription,
        outcome: trajectoryOutcome,
        featureMapId: featureMap.id,
        predictionMeta,
      })
      .catch((err) =>
        this.logger.warn(
          `[PrdMemoryBridge] TrajectoryWriter.write() failed non-fatally: ${(err as Error).message}`,
        ),
      );

    this.logger.log(
      `[PrdMemoryBridge] Trajectory written: tenant=${session.teamId} specialist=${session.specialist} outcome=${trajectoryOutcome}`,
    );

    return { written, skipped };
  }

  private classifyOutcome(
    history: TaskPrdRequirement[],
  ): 'flipped' | 'final_fail' | 'human_pass' | null {
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    const everFailed = history.some((h) => !h.satisfied);
    if (!everFailed) return null; // passed on iter 1 — no signal
    if (last.status === 'human_pass') return 'human_pass';
    if (last.satisfied) return 'flipped';
    return 'final_fail';
  }

  private buildSummary(
    featureMap: TaskPrdFeatureMap,
    requirementId: string,
    outcome: 'flipped' | 'final_fail' | 'human_pass',
    firstFail: TaskPrdRequirement | undefined,
    last: TaskPrdRequirement,
  ): string {
    const tag = `[prd:${featureMap.id}:${requirementId}]`;
    const goal = featureMap.goalTitle || featureMap.goal || 'unknown goal';
    const reqText = last.requirementText.slice(0, 200);
    const failedEvaluator = firstFail?.evaluatorName || 'unknown';
    const failureReason = firstFail?.errorMessage || 'no error captured';

    switch (outcome) {
      case 'flipped':
        return `${tag} Requirement "${reqText}" (goal: ${goal}) failed on iteration ${firstFail?.iterationNumber} via ${failedEvaluator} ("${failureReason}") and passed on iteration ${last.iterationNumber}. Specialist self-corrected.`;
      case 'final_fail':
        return `${tag} Requirement "${reqText}" (goal: ${goal}) never satisfied after ${last.iterationNumber} iterations. Last evaluator: ${last.evaluatorName}. Last error: ${last.errorMessage ?? 'none'}.`;
      case 'human_pass':
        return `${tag} Requirement "${reqText}" (goal: ${goal}) required human approval after ${last.iterationNumber} iterations. Human note: ${last.humanNote ?? 'none'}.`;
    }
  }

  private buildKeywords(
    featureMap: TaskPrdFeatureMap,
    last: TaskPrdRequirement,
  ): string[] {
    const flagKeys = Object.keys(last.flags || {});
    const taskWords = featureMap.taskSlug.split(/[\s\-_]+/).slice(0, 4);
    return [featureMap.team, ...flagKeys, ...taskWords].filter(Boolean);
  }

  // =========================================================================
  // PHASE 2 — Read side
  // =========================================================================

  /**
   * Returns top-K prior failures for this (team, specialist) cohort,
   * semantically ranked against the task description.
   *
   * Used by PrdGeneratorService to inject a "prior failures" block into
   * the PRD-generation prompt. The LLM uses this as prior knowledge,
   * not as decision-making input.
   *
   * Read path:
   *   1. Embed taskText via Vertex
   *   2. pgvector cosine search agent_episodes WHERE domain=team AND owner_id=specialist
   *   3. Filter to episodeType in ('pattern','correction') — only failure-derived rows
   *   4. Return top-K with their summary + keywords for prompt injection
   *
   * Falls back to keyword scan if embed fails (no LLM dependency on read path).
   */
  async getPriorFailures(
    team: string,
    specialist: string,
    taskText: string,
    topK = 5,
  ): Promise<
    Array<{ summary: string; keywords: string[]; episodeType: string }>
  > {
    if (!taskText || taskText.trim().length < 5) return [];

    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.vertexEmbed.embed(taskText.slice(0, 500));
    } catch (e) {
      this.logger.warn(
        `[PrdMemoryBridge] embed failed on read path, falling back to keyword scan: ${(e as Error).message}`,
      );
    }

    if (queryEmbedding) {
      const rows = await this.dataSource.query(
        `SELECT summary, keywords, episode_type
         FROM agent_episodes
         WHERE domain = $1
           AND owner_id = $2
           AND episode_type IN ('pattern', 'correction')
           AND embedding IS NOT NULL
         ORDER BY CAST(embedding AS vector) <=> CAST($3 AS vector)
         LIMIT $4`,
        [team, specialist, toSql(queryEmbedding), topK],
      );
      return rows.map((r: any) => ({
        summary: r.summary,
        keywords: r.keywords ?? [],
        episodeType: r.episode_type,
      }));
    }

    // Fallback: keyword overlap scan
    const taskKeywords = taskText
      .toLowerCase()
      .split(/[\s\-_,.]+/)
      .filter((w) => w.length > 3)
      .slice(0, 6);
    if (taskKeywords.length === 0) return [];

    const rows = await this.dataSource.query(
      `SELECT summary, keywords, episode_type
       FROM agent_episodes
       WHERE domain = $1
         AND owner_id = $2
         AND episode_type IN ('pattern', 'correction')
         AND keywords && $3::text[]
       ORDER BY created_at DESC
       LIMIT $4`,
      [team, specialist, taskKeywords, topK],
    );
    return rows.map((r: any) => ({
      summary: r.summary,
      keywords: r.keywords ?? [],
      episodeType: r.episode_type,
    }));
  }

  /**
   * Pre-formatted block for direct prompt injection.
   * Returns empty string when there are no priors — caller can concat safely.
   */
  async buildPriorFailuresPromptBlock(
    team: string,
    specialist: string,
    taskText: string,
    topK = 5,
  ): Promise<string> {
    const priors = await this.getPriorFailures(
      team,
      specialist,
      taskText,
      topK,
    );
    if (priors.length === 0) return '';

    const lines = priors.map((p, i) => {
      const tagPrefix =
        p.episodeType === 'correction'
          ? '[NEVER SATISFIED]'
          : '[SELF-CORRECTED]';
      const stripped = p.summary.replace(/^\[prd:[^\]]+\]\s*/, '');
      return `  ${i + 1}. ${tagPrefix} ${stripped}`;
    });

    return [
      '',
      'PRIOR FAILURES (historical signal for this specialist — use to anticipate hard requirements):',
      ...lines,
      '',
    ].join('\n');
  }
}
