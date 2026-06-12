import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { VisionFile } from '../vision/vision.types';

export type ProjectTeam = 'coding' | 'general' | 'research';

@Entity('diveseeks_projects')
export class DiveSeeksProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'coding' })
  team: ProjectTeam;

  @Column({ nullable: true })
  githubRepo: string;

  @Column({ default: 'main' })
  githubBranch: string;

  @Column('simple-array', { nullable: true })
  techStack: string[];

  @Column({ nullable: true })
  language: string;

  @Column({ default: 'pending' })
  indexStatus: 'pending' | 'indexing' | 'ready' | 'stale';

  @Column({ nullable: true })
  lastIndexedAt: string;

  @Column({ type: 'text', nullable: true })
  abigailBranch: string | null;

  @Column({ type: 'text', nullable: true })
  githubRepoId: string | null;

  @Column({ type: 'uuid', nullable: true })
  dataRepoId: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true, default: null })
  visionFile: VisionFile | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  workflowType: 'autonomous' | 'canvas' | null;

  @Column({
    name: 'lifecycle_status',
    type: 'varchar',
    length: 40,
    default: 'draft',
  })
  lifecycleStatus: string;

  @Column({ name: 'completion_summary', type: 'text', nullable: true })
  completionSummary: string | null;

  @Column({
    name: 'completion_checklist',
    type: 'jsonb',
    nullable: true,
    default: null,
  })
  completionChecklist: Record<string, boolean> | null;

  @Column({
    name: 'update_requests',
    type: 'jsonb',
    nullable: true,
    default: null,
  })
  updateRequests: unknown[] | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
