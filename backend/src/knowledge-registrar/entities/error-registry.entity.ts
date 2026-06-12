import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('kr_errors')
@Index(['tenantId', 'errorHash'])
export class ErrorRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'char', length: 64 })
  @Index()
  errorHash: string;

  @Column({ type: 'char', length: 64 })
  contextFingerprint: string;

  @Column()
  errorType: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  stack: string | null;

  @Column({ type: 'varchar', nullable: true })
  mcpId: string | null;

  @Column({ type: 'varchar', nullable: true })
  specialistId: string | null;

  @Column({ type: 'varchar', nullable: true })
  taskId: string | null;

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, any>;

  @Column({ default: ErrorSeverity.MEDIUM })
  severity: ErrorSeverity;

  @Column({ default: 1 })
  occurrenceCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  solutionId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
