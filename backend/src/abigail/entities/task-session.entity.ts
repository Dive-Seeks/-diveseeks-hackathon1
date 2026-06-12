import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SpecialistId =
  | 'rex'
  | 'nova'
  | 'kai'
  | 'sage'
  | 'atlas'
  | 'orion'
  | 'pixel'
  | 'luma'
  | 'felix'
  | 'vex';

export type TeamId = 'coding' | 'general' | 'research';
export type OutputType = 'code' | 'text' | 'document';

export interface DisciplineReport {
  tdd: number | null; // 0–1, applicable to: rex, nova, sage
  debugging: number | null; // 0–1, applicable to: pixel, felix, vex
  architecture: number | null; // 0–1, applicable to: rex, nova, atlas, orion
  completeness: number | null; // 0–1, applicable to: all
  flags: string[]; // human-readable issues, e.g. "no test files in output"
  overall: number; // mean of applicable scores only
}

@Entity('task_sessions')
// Prevents the session-duplication bug: at most one PENDING session per
// (team, project, task, specialist). Partial index so done/failed/etc. are unconstrained.
@Index(
  'ux_task_session_pending_dedup',
  ['teamId', 'projectId', 'taskDescription', 'specialist'],
  {
    unique: true,
    where: `"status" = 'pending'`,
  },
)
export class TaskSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column()
  userId: string;

  @Column()
  projectId: string;

  @Column()
  specialist: SpecialistId;

  @Column({ type: 'text', nullable: true })
  alsoSpecialist?: SpecialistId;

  @Column({ name: 'team', default: 'coding' })
  team: TeamId;

  @Column({ name: 'output_type', default: 'code' })
  outputType: OutputType;

  @Column()
  status:
    | 'pending'
    | 'running'
    | 'review'
    | 'done'
    | 'failed'
    | 'needs_human'
    | 'orphaned'
    | 'cancelled';

  @Column({ name: 'checkout_run_id', type: 'uuid', nullable: true })
  checkoutRunId: string | null;

  @Column({ name: 'execution_locked_at', type: 'timestamptz', nullable: true })
  executionLockedAt: Date | null;

  @Column('text')
  taskDescription: string;

  @Column('jsonb')
  context: {
    rules: string[];
    errorPatterns: string[];
    projectContext: any;
    visionSummary?: string;
    companyKnowledge?: string;
    chatHistory?: string;
    specKitContext?: string;
    matchedWeightIds?: string[];
    injectedWeights?: string[];
    webKnowledge?: string[];
    webKnowledgePrompt?: string;
    researchJobId?: string | null;
    tceTaskId?: string;
    goalId?: string;
    source?: string;
    // Step 3C
    reasoningTrace?: any[]; // Sequential thinking audit trail
    caiFlags?: string[]; // CAI rules that fired
    decomposedSubTasks?: string[]; // Multi-domain task breakdown
    bootstrapMode?: boolean; // Cold-start detection
    gitContext?: string; // Codebase context injection
    skillsContext?: string; // Assembled active skills for this specialist
    pluginsContext?: string; // Assembled active plugin tool descriptions
    // Hermes user state
    user_state?: {
      emotional_state: string;
      repeated_topics: string[];
      alert_count_today: number;
      last_alert_at: string | null;
    };
    architecturalWarning?: any | null;
    predictionMeta?: any | null;
    goalAncestry?: {
      taskTitle: string;
      goalId: string;
      goalTitle: string;
      goalDescription: string;
      projectName: string;
      projectDescription: string;
    } | null;
    // Step 0.5 — injected by AbigailMindService for sage-only sessions
    prdContext?: {
      prdFeatureMapId: string;
      goal: string;
      startingRoute: string;
      features: any[];
      seedFile: string;
      fixturesFile: string;
      version: number;
    } | null;
    /** Which executor ran the task ('local' | 'adk' | 'hermes') — stamped by dispatch engine. */
    executorBackend?: string;
  };

  @Column('jsonb')
  profileFlags: {
    skillLevel: 'junior' | 'comfortable' | 'experienced' | 'expert';
    taskSizeMultiplier: number;
    needsInlineComments: boolean;
    needsPrExplanation: boolean;
    offerImprovement: boolean;
    learningMaterialDepth: 0 | 1 | 2;
  };

  @Column({ type: 'jsonb', nullable: true })
  disciplineReport: DisciplineReport | null;

  @Column('jsonb', { nullable: true })
  toolUsageReport?: any;

  @Column('text', { nullable: true })
  result?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ name: 'current_step', type: 'varchar', nullable: true })
  currentStep: string | null;

  @Column({ name: 'current_group', type: 'varchar', nullable: true })
  currentGroup: string | null;

  @Column({ name: 'last_completed_step', type: 'varchar', nullable: true })
  lastCompletedStep: string | null;

  @Column({ name: 'step_checkpoint', type: 'jsonb', nullable: true })
  stepCheckpoint: Record<string, unknown> | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;
}
