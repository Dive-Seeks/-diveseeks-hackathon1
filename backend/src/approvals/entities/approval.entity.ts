import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'resubmitted';

export type ApprovalType =
  | 'specialist_output'
  | 'hire_agent'
  | 'budget_override';

@Entity('approvals')
@Index(['tenantId'])
@Index(['status'])
@Index(['requestedByAgentId'])
export class Approval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column()
  type: string;

  @Column({ name: 'requested_by_agent_id', type: 'uuid' })
  requestedByAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by_agent_id' })
  requestedByAgent: Agent;

  @Column({ name: 'reviewed_by_agent_id', type: 'uuid', nullable: true })
  reviewedByAgentId: string | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_agent_id' })
  reviewedByAgent: Agent | null;

  @Column({ default: 'pending' })
  status: ApprovalStatus;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote: string | null;

  @Column({ name: 'resolved_by_agent_id', type: 'uuid', nullable: true })
  resolvedByAgentId: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'signed_token', type: 'text', nullable: true })
  signedToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
