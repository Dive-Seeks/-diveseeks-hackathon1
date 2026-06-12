import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
}

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  definitionId: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.PENDING,
  })
  status: WorkflowStatus;

  @Column({ type: 'jsonb', default: {} })
  state: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  completedSteps: string[];

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
