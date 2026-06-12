import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Immutable audit log — NEVER updated, NEVER deleted */
@Entity('activity_log')
@Index(['tenantId'])
@Index(['agentId'])
@Index(['issueId'])
@Index(['action'])
@Index(['createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'issue_id', type: 'uuid', nullable: true })
  issueId: string | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string | null;

  @Column()
  actor: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
