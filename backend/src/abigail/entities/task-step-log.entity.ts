import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('task_step_logs')
@Index(['sessionId', 'stepKey'])
@Index(['tenantId', 'createdAt'])
export class TaskStepLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'step_key' })
  stepKey: string;

  @Column({ name: 'group_key' })
  groupKey: string;

  @Column({ name: 'attempt', type: 'int', default: 1 })
  attempt: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['running', 'completed', 'failed', 'degraded', 'skipped'],
  })
  status: 'running' | 'completed' | 'failed' | 'degraded' | 'skipped';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'checkpoint_data', type: 'jsonb', nullable: true })
  checkpointData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
