import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuditPhase {
  BRAINSTORM = 'brainstorm',
  PLAN = 'plan',
  PLAN_AUDIT = 'plan_audit',
  WORKFLOW_SPEC = 'workflow_spec',
  WORKFLOW_AUDIT = 'workflow_audit',
  EXECUTING = 'executing',
  MISTAKE_PROCESSING = 'mistake_processing',
  FINAL_AUDIT = 'final_audit',
  DONE = 'done',
  FAILED = 'failed',
}

@Entity('audit_loops')
export class AuditLoop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'text' })
  originatingRequest: string;

  @Column({ type: 'uuid', nullable: true })
  brainSessionId: string;

  @Column({ type: 'uuid', nullable: true })
  workflowExecutionId: string;

  @Column({
    type: 'enum',
    enum: AuditPhase,
    default: AuditPhase.BRAINSTORM,
  })
  currentPhase: AuditPhase;

  @Column({ default: 0 })
  currentRound: number;

  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  finalScore: number;

  @Column({ default: 'running' })
  status: 'running' | 'completed' | 'escalated' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  escalationReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}

@Entity('audit_artifacts')
export class AuditArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loopId: string;

  @Column()
  round: number;

  @Column()
  kind: 'plan' | 'workflow_spec' | 'corrected_plan' | 'corrected_workflow';

  @Column({ type: 'uuid', nullable: true })
  parentArtifactId: string;

  @Column({ type: 'jsonb' })
  content: any;

  @Column({ type: 'char', length: 64 })
  contentHash: string;

  @Column({ type: 'jsonb', nullable: true })
  frontmatter: any;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('audit_findings')
export class AuditFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loopId: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column()
  round: number;

  @Column()
  phase: string;

  @Column({ default: 'medium' })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column()
  criterion: string;

  @Column({ type: 'text' })
  evidence: string;

  @Column({ type: 'text' })
  suggestedFix: string;

  @Column({ nullable: true })
  specialistId: string;

  @Column({ nullable: true })
  stepKey: string;

  @Column({ nullable: true })
  routedTo: 're-plan' | 're-workflow' | 'retry-step' | 'evolve' | 'human';

  @Column({ type: 'uuid', nullable: true })
  evolveTrajectoryId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('audit_scores')
export class AuditScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loopId: string;

  @Column()
  round: number;

  @Column()
  phase: string;

  @Column()
  criterion: string;

  @Column({ type: 'numeric', precision: 3, scale: 1 })
  score: number;

  @Column()
  auditorSpecialistId: string;

  @Column({ type: 'text' })
  rationale: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('audit_rubrics')
export class AuditRubric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column()
  phase: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'jsonb' })
  criteria: Array<{
    name: string;
    description: string;
    weight: number;
    scoringPrompt: string;
  }>;

  @Column({ type: 'numeric', precision: 3, scale: 1, default: 9.0 })
  passingThreshold: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentRubricId: string;

  @CreateDateColumn()
  createdAt: Date;
}
