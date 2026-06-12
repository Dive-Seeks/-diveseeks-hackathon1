import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StepExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('workflow_step_executions')
export class WorkflowStepExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  executionId: string;

  @Column({ length: 120 })
  stepKey: string;

  @Column({
    type: 'enum',
    enum: StepExecutionStatus,
    default: StepExecutionStatus.QUEUED,
  })
  status: StepExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
