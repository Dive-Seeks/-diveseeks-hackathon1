import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type BrainSessionState = 'pending' | 'ideating' | 'complete';
export type BrainIntentType =
  | 'feature'
  | 'architecture'
  | 'design'
  | 'new_module';
export type BrainTechnique =
  | 'free_association'
  | 'scamper'
  | 'six_hats'
  | 'reverse'
  | 'analogy'
  | 'constraint'
  | 'five_whys'
  | 'morphological'
  | 'smart'
  | 'premortem'
  | 'diverge';

@Entity('brain_sessions')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'state'])
@Index(['tenantId', 'projectId'])
export class BrainSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'task_session_id', type: 'uuid', nullable: true })
  taskSessionId: string | null;

  @Column('text')
  topic: string;

  @Column({ name: 'intent_type', type: 'varchar', length: 20 })
  intentType: BrainIntentType;

  @Column({ type: 'varchar', length: 30 })
  technique: BrainTechnique;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  state: BrainSessionState;

  @Column({ name: 'current_thread', length: 100, default: 'MAIN' })
  currentThread: string;

  @Column({ name: 'thread_stack', type: 'jsonb', default: '["MAIN"]' })
  threadStack: string[];

  @Column({ name: 'fork_count', default: 0 })
  forkCount: number;

  @Column({ name: 'idea_count', default: 0 })
  ideaCount: number;

  @Column('text', { nullable: true })
  summary: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
