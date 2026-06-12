import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('project_reports')
@Index(['tenantId', 'projectId'])
export class ProjectReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'report_markdown', type: 'text', nullable: true })
  reportMarkdown: string | null;

  @Column({ name: 'tsv_data', type: 'text', nullable: true })
  tsvData: string | null;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
