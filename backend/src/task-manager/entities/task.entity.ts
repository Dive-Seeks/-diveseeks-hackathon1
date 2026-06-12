import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskStatus {
  PENDING = 'pending',
  READY = 'ready',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked',
  PAUSED = 'paused',
}

export enum TaskKind {
  SPECIALIST_DISPATCH = 'specialist_dispatch',
  TOOL_CALL = 'tool_call',
  PARALLEL = 'parallel',
  APPROVAL_GATE = 'approval_gate',
  WAIT = 'wait',
  WEBHOOK = 'webhook',
  NESTED_WORKFLOW = 'nested_workflow',
  CONDITION = 'condition',
  LOOP = 'loop',
  CUSTOM = 'custom',
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

@Entity('tm_tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  parentTaskId: string;

  @Column({ type: 'uuid', nullable: true })
  workflowExecutionId: string;

  @Column({ type: 'enum', enum: TaskKind, default: TaskKind.CUSTOM })
  kind: TaskKind;

  @Column({ length: 200 })
  subject: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  retryPolicy: RetryPolicy;

  @Column({ type: 'int', nullable: true })
  timeoutMs: number;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'uuid', nullable: true })
  assignedSpecialist: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
