import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_rules')
@Index(['tenantId', 'domain'])
export class AgentRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column() domain: string; // e.g. 'menu', 'analytics', 'seo'
  @Column({ name: 'rule_key' }) ruleKey: string; // unique key within domain e.g. 'halal_policy'
  @Column({ type: 'jsonb' }) columns: string[]; // TSV column headers for this rule set
  @Column({ type: 'jsonb' }) rows: Record<string, string>[]; // the rule data rows
  @Column({ default: true }) active: boolean;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
