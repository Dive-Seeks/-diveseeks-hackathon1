import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('task_trajectories')
@Index(['tenantId', 'specialistId', 'approved', 'createdAt'])
export class TaskTrajectory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'specialist_id' })
  specialistId: string;

  @Column({ name: 'team' })
  team: string;

  @Column({ name: 'task_description', type: 'text' })
  taskDescription: string;

  @Column({ name: 'outcome' })
  outcome: 'pass' | 'fail' | 'needs_review';

  @Column({ name: 'approved', default: false })
  approved: boolean;

  @Column({ name: 'feature_map_id', type: 'uuid', nullable: true })
  featureMapId: string | null;

  @Column({ name: 'model_provider', type: 'varchar', nullable: true })
  modelProvider: string | null;

  @Column({ name: 'model_id', type: 'varchar', nullable: true })
  modelId: string | null;

  @Column({ name: 'was_user_model', default: false })
  wasUserModel: boolean;

  @Column({
    name: 'prediction_confidence',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  predictionConfidence: number | null;

  @Column({ name: 'prediction_basis', type: 'varchar', nullable: true })
  predictionBasis: string | null;

  // Brain memory enrichment (Phase 4) — nullable, backward-compatible
  @Column({ name: 'emotion_tag', type: 'varchar', nullable: true })
  emotionTag: string | null;

  @Column({ name: 'failure_class', type: 'varchar', nullable: true })
  failureClass: string | null;

  @Column({ name: 'criteria_met_count', type: 'int', nullable: true })
  criteriaMetCount: number | null;

  @Column({ name: 'criteria_unmet_count', type: 'int', nullable: true })
  criteriaUnmetCount: number | null;

  @Column({ name: 'iteration_count', type: 'int', nullable: true })
  iterationCount: number | null;

  @Column({ name: 'prediction_meta', type: 'jsonb', nullable: true })
  predictionMeta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
