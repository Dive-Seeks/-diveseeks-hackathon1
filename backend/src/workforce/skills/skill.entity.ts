import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_skills')
@Index(['tenantId', 'skillName'])
export class AgentSkill {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true }) tenantId:
    | string
    | null; // null = platform-wide default
  @Column({ name: 'skill_name' }) skillName: string; // directory name e.g. 'halal-compliance'
  @Column({ type: 'varchar', nullable: true }) domain: string | null; // null = all domains
  @Column({ name: 'target_roles', type: 'text', array: true, default: '{}' })
  targetRoles: string[];
  @Column({ default: true }) active: boolean;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
