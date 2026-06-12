import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type HermesAgentInstanceStatus =
  | 'provisioning'
  | 'running'
  | 'stopped'
  | 'failed';

@Entity('hermes_agent_instances')
@Index(['tenantId'], { unique: true })
export class HermesAgentInstance {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;

  @Column({ name: 'container_name', length: 128 }) containerName: string;

  @Column({ name: 'endpoint', length: 256 }) endpoint: string;

  @Column({ name: 'api_server_key', length: 128 }) apiServerKey: string;

  @Column({ name: 'status', length: 20, default: 'provisioning' })
  status: HermesAgentInstanceStatus;

  /** Tenant-level opt-in, toggled from the LLM settings UI. Env allowlist overrides to true. */
  @Column({ name: 'enabled', default: false }) enabled: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
