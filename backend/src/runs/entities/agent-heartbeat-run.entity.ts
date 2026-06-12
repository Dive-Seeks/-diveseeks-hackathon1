import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { AgentIssue } from '../../issues/entities/agent-issue.entity';

@Entity('agent_heartbeat_runs')
@Index(['agentId'])
@Index(['issueId'])
@Index(['tenantId'])
@Index(['idempotencyKey'], { unique: true })
export class AgentHeartbeatRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issue_id', type: 'uuid' })
  issueId: string;

  @ManyToOne(() => AgentIssue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue: AgentIssue;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ default: 1 })
  attempt: number;

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @Column({ default: 'running' })
  status: string;

  @Column({ name: 'input_tokens', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', default: 0 })
  outputTokens: number;

  @Column({
    name: 'cost_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costUsd: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'excerpt_output', type: 'text', nullable: true })
  excerptOutput: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
