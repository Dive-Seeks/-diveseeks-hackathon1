import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  steps: WorkflowStepDefinition[];

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface WorkflowStepDefinition {
  key: string;
  specialistId: string;
  promptTemplateName: string;
  dependsOn?: string[];
  inputMapping?: Record<string, string>; // mapping from workflow state to prompt variables
  outputKey?: string; // where to store the result in workflow state
}
