import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CoordinatorJobKind =
  | 'plan' // creates an implementation plan
  | 'spec' // writes a spec file
  | 'assign' // assigns a task to a specialist
  | 'security_scan' // platform security audit
  | 'behaviour_audit' // agent behaviour review
  | 'practice_check' // good/bad practice + error pattern review
  | 'gap_fill'; // fills a vision gap autonomously

export type CoordinatorJobStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'skipped'; // skipped = security check failed; safe to skip

@Entity('coordinator_jobs')
export class CoordinatorJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({
    type: 'enum',
    enum: [
      'plan',
      'spec',
      'assign',
      'security_scan',
      'behaviour_audit',
      'practice_check',
      'gap_fill',
    ],
  })
  kind: CoordinatorJobKind;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'done', 'failed', 'skipped'],
    default: 'pending',
  })
  status: CoordinatorJobStatus;

  // What the job is about
  @Column({ type: 'text', nullable: true })
  subject: string | null;

  // Which specialist it was assigned to (if kind='assign')
  @Column({ type: 'varchar', nullable: true })
  assignedSpecialist: string | null;

  // Output — plan text, spec summary, scan report, etc.
  @Column({ type: 'text', nullable: true })
  output: string | null;

  // Findings from security/practice checks
  @Column({ type: 'jsonb', nullable: true })
  findings: Record<string, any> | null;

  // Link back to a task_session, tce_task, or audit_loop if spawned
  @Column({ type: 'varchar', nullable: true })
  linkedEntityId: string | null;

  @Column({ type: 'varchar', nullable: true })
  linkedEntityType: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // [OC-4] Tool policy — null = unrestricted (user-initiated), set by coordinator for autonomous jobs
  @Column({ type: 'jsonb', nullable: true })
  toolPolicy: { allow: string[]; deny: string[] } | null;
}
