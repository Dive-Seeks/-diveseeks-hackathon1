import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ContinuationStatus {
  PAUSED = 'paused',
  RESUMED = 'resumed',
  ABANDONED = 'abandoned',
}

@Entity('kr_continuations')
@Index(['tenantId', 'status'])
export class ContinuationRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  taskId: string;

  @Column({ type: 'varchar', nullable: true })
  workflowExecutionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  auditLoopId: string | null;

  @Column({ type: 'text' })
  pauseReason: string;

  @Column({ type: 'jsonb' })
  resumeContext: Record<string, any>;

  @Column({ type: 'varchar', length: 50 })
  pausedAtPhase: string;

  @Column({ default: ContinuationStatus.PAUSED })
  status: ContinuationStatus;

  @Column({ type: 'timestamp', nullable: true })
  resumedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
