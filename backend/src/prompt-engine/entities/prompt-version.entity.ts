import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum PromptVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
}

export interface VariableSchema {
  name: string;
  required: boolean;
  default?: string;
  description?: string;
}

@Entity('prompt_versions')
export class PromptVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  promptId: string;

  @Column()
  version: number;

  @Column({ type: 'char', length: 64 })
  contentHash: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: [] })
  variableSchema: VariableSchema[];

  @Column({ type: 'text', array: true, default: [] })
  partialRefs: string[];

  @Column({ type: 'text', nullable: true })
  changeNote: string;

  @Column({ type: 'uuid', nullable: true })
  parentVersionId: string;

  @Column({
    type: 'enum',
    enum: PromptVersionStatus,
    default: PromptVersionStatus.DRAFT,
  })
  status: PromptVersionStatus;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
