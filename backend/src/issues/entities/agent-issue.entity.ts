import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export type IssueStatus =
  | 'todo'
  | 'assigned'
  | 'in_progress'
  | 'in_review'
  | 'waiting_approval'
  | 'done'
  | 'rejected'
  | 'cancelled';

export type OriginKind = 'routine' | 'manual' | 'chat' | 'hire';

@Entity('agent_issues')
@Index(['tenantId'])
@Index(['assigneeAgentId'])
@Index(['status'])
@Index(['domain'])
@Index(['sessionId'])
export class AgentIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'assignee_agent_id', type: 'uuid' })
  assigneeAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignee_agent_id' })
  assigneeAgent: Agent;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  domain: string | null;

  @Column({ default: 'todo' })
  status: IssueStatus;

  @Column({ type: 'varchar', nullable: true })
  priority: string | null;

  @Column({ name: 'checkout_run_id', type: 'uuid', nullable: true })
  checkoutRunId: string | null;

  @Column({ name: 'execution_locked_at', type: 'timestamptz', nullable: true })
  executionLockedAt: Date | null;

  @Column({ name: 'goal_ancestry', type: 'jsonb', nullable: true })
  goalAncestry: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  constraints: Record<string, any> | null;

  @Column({ name: 'parent_issue_id', type: 'uuid', nullable: true })
  parentIssueId: string | null;

  @ManyToOne(() => AgentIssue, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_issue_id' })
  parentIssue: AgentIssue | null;

  @Column({ name: 'origin_kind', type: 'varchar', nullable: true })
  originKind: OriginKind | null;

  @Column({ name: 'work_products', type: 'jsonb', nullable: true })
  workProducts: Record<string, any>[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
