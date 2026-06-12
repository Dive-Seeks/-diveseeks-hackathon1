import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  PrdFeature,
  TaskPrdFeatureMapStatus,
  TeamName,
} from '../interfaces/prd-base.interface';

@Entity('task_prd_feature_maps')
@Index(['tenantId', 'taskSessionId'])
@Index(['status', 'lastIterationAt'])
export class TaskPrdFeatureMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'task_session_id' })
  taskSessionId: string;

  @Column('varchar', { name: 'task_slug', length: 120 })
  taskSlug: string;

  @Column('varchar', { length: 20, default: 'coding' })
  team: TeamName;

  @Column('varchar', { name: 'goal_id', length: 20, nullable: true })
  goalId: string | null;

  @Column('text', { name: 'goal_title', nullable: true })
  goalTitle: string | null;

  @Column('text', { name: 'goal_description', nullable: true })
  goalDescription: string | null;

  @Column('text')
  goal: string;

  @Column('varchar', { name: 'starting_route', length: 200, nullable: true })
  startingRoute: string | null;

  @Column('jsonb')
  features: PrdFeature[];

  @Column('text', { name: 'generated_from' })
  generatedFrom: string;

  @Column('text', { name: 'human_notes', nullable: true })
  humanNotes: string | null;

  @Column('int', { default: 1 })
  version: number;

  @Column('int', { name: 'total_requirements', default: 0 })
  totalRequirements: number;

  @Column('int', { name: 'satisfied_requirements', default: 0 })
  satisfiedRequirements: number;

  @Column('int', { name: 'current_iteration', default: 0 })
  currentIteration: number;

  @Column('timestamptz', { name: 'last_iteration_at', nullable: true })
  lastIterationAt: Date | null;

  @Column('varchar', { length: 20, default: 'pending' })
  status: TaskPrdFeatureMapStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
