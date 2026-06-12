import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskKind, RetryPolicy } from './task.entity';

@Entity('tm_task_templates')
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ length: 120 })
  slug: string;

  @Column({ type: 'enum', enum: TaskKind, default: TaskKind.CUSTOM })
  kind: TaskKind;

  @Column({ type: 'jsonb', nullable: true })
  defaultPayload: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  variableSchema: Array<{ name: string; required: boolean; default?: any }>;

  @Column({ type: 'jsonb', nullable: true })
  retryPolicy: RetryPolicy;

  @Column({ type: 'int', nullable: true })
  defaultTimeoutMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
