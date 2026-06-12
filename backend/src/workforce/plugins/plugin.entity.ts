import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_plugins')
@Index(['tenantId', 'pluginName'])
export class AgentPlugin {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true }) tenantId:
    | string
    | null; // null = platform-wide
  @Column({ name: 'plugin_name' }) pluginName: string; // directory name e.g. 'google-reviews'
  @Column({ type: 'text', array: true, default: '{}' }) domains: string[]; // which domains can use it
  @Column({ default: true }) active: boolean;
  @Column({ type: 'text', nullable: true }) config: string | null; // optional JSON config overrides
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
