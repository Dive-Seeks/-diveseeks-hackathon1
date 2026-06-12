import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TaskPrdRequirementStatus } from '../interfaces/prd-base.interface';

@Entity('task_prd_requirements')
@Index(['featureMapId', 'requirementId', 'iterationNumber'])
@Index(['tenantId', 'taskSessionId'])
export class TaskPrdRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'feature_map_id' })
  featureMapId: string;

  @Column('uuid', { name: 'task_session_id' })
  taskSessionId: string;

  @Column('varchar', { name: 'requirement_id', length: 20 })
  requirementId: string;

  @Column('text', { name: 'requirement_text' })
  requirementText: string;

  @Column('jsonb', { default: () => "'{}'::jsonb" })
  flags: Record<string, unknown>;

  @Column('boolean', { default: false })
  satisfied: boolean;

  @Column('varchar', { length: 20, default: 'pending' })
  status: TaskPrdRequirementStatus;

  @Column('jsonb', { nullable: true })
  evidence: Record<string, unknown> | null;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage: string | null;

  @Column('int', { name: 'iteration_number', default: 0 })
  iterationNumber: number;

  @Column('varchar', { name: 'evaluator_name', length: 200, nullable: true })
  evaluatorName: string | null;

  @Column('text', { name: 'human_note', nullable: true })
  humanNote: string | null;

  @Column('varchar', { name: 'spec_file', length: 200, nullable: true })
  specFile: string | null;

  @Column('varchar', { name: 'screenshot_path', length: 300, nullable: true })
  screenshotPath: string | null;

  @Column('jsonb', { name: 'dom_event_log', nullable: true })
  domEventLog: unknown[] | null;

  @Column('jsonb', { name: 'attr_change_log', nullable: true })
  attrChangeLog: unknown[] | null;

  @Column('jsonb', { name: 'aria_snapshots', nullable: true })
  ariaSnapshots: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
