import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tm_task_attempts')
export class TaskAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column()
  attemptNumber: number;

  @Column({ default: 'running' })
  status: 'running' | 'succeeded' | 'failed';

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
