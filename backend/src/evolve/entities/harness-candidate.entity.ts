import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * A candidate harness configuration in the meta-optimization population.
 * Each candidate = a set of parameters that control HOW the evolve system runs:
 *   judge prompt, thresholds, eval criteria, feedback templates.
 *
 * Modelled after Facebook RAM Autodata's population-based meta-optimizer.
 */
@Entity('harness_candidates')
export class HarnessCandidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  parentId: string | null;

  @Column('uuid', { nullable: true })
  tenantId: string | null;
  // null = global seed candidate (bootstrap pool for tenants with < 25 trajectories)

  @Column('int', { default: 0 })
  generation: number;

  @Column('jsonb')
  config: HarnessConfig;

  @Column('decimal', { precision: 5, scale: 3, nullable: true })
  trainScore: number | null;

  @Column('decimal', { precision: 5, scale: 3, nullable: true })
  valScore: number | null;

  @Column('decimal', { precision: 5, scale: 3, nullable: true })
  trainGap: number | null;

  @Column('decimal', { precision: 5, scale: 3, nullable: true })
  valGap: number | null;

  @Column({ default: 'pending' })
  status: 'pending' | 'evaluating' | 'accepted' | 'rejected';

  @Column('text', { nullable: true })
  diffDescription: string | null;

  @Column('text', { nullable: true })
  rootCauseAnalysis: string | null;

  @Column('text', { array: true, default: [] })
  discoveredPatterns: string[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  evaluatedAt: Date | null;
}

export interface HarnessConfig {
  /** System prompt fragment for the judge — injected into judge ensemble calls */
  judgeSystemPrompt: string;
  /** Threshold: weak model avg must be at or below this */
  weakThreshold: number;
  /** Threshold: strong model avg must be at or above this */
  strongThreshold: number;
  /** Threshold: gap (strong - weak) must be at or above this */
  gapThreshold: number;
  /** Number of weak solver runs per task */
  weakRuns: number;
  /** Number of strong solver runs per task */
  strongRuns: number;
  /** Number of judge ensemble members */
  judgeCount: number;
  /** Feedback template for the analyzer when gap is too low */
  analyzerFeedbackTemplate: string;
  /** Whether to use positive-only rubric (FB Autodata discovery) */
  positiveOnlyRubric: boolean;
  /** Max weight per rubric criterion (FB: capped at 7) */
  maxCriterionWeight: number;
  /** Context leakage self-test instruction */
  contextLeakCheck: string;
}
