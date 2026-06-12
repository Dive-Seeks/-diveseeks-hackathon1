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

/**
 * AgentConfigRevision — Paperclip pattern.
 * Every hire/patch/config change snapshots the before/after state.
 * Immutable — never updated, never deleted.
 */
@Entity('agent_config_revisions')
@Index(['agentId'])
@Index(['tenantId'])
@Index(['createdAt'])
export class AgentConfigRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'changed_by', type: 'varchar' })
  changedBy: string; // agentId or userId who made the change

  @Column({ name: 'change_type', type: 'varchar' })
  changeType: string; // 'hired' | 'updated' | 'terminated' | 'config_change'

  @Column({ name: 'before_snapshot', type: 'jsonb', nullable: true })
  beforeSnapshot: Record<string, any> | null;

  @Column({ name: 'after_snapshot', type: 'jsonb' })
  afterSnapshot: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
