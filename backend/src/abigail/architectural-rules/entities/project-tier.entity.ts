import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ProjectTierLevel = 'solo' | 'startup' | 'scaleup' | 'enterprise';
export type ProjectType = 'greenfield' | 'existing' | 'migration';
export type ProjectLifetime = 'prototype' | 'long-term';

export const TIER_VALUES: Record<ProjectTierLevel, number> = {
  solo: 0,
  startup: 1,
  scaleup: 2,
  enterprise: 3,
};

@Entity('project_tiers')
@Index(['projectId'])
export class ProjectTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 20 })
  tier: ProjectTierLevel;

  @Column({ type: 'int' })
  teamSize: number;

  @Column({ type: 'varchar', length: 30 })
  projectType: ProjectType;

  @Column({ type: 'varchar', length: 20 })
  lifetime: ProjectLifetime;

  @Column({ default: false })
  autoPromoted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  promotedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
