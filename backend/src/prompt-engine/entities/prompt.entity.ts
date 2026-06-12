import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum PromptKind {
  SYSTEM = 'system',
  ROLE = 'role',
  MEMORY = 'memory',
  TEMPLATE = 'template',
  PARTIAL = 'partial',
}

export enum PromptReleaseLabel {
  DEV = 'dev',
  STAGING = 'staging',
  PROD = 'prod',
}

@Entity('prompts')
export class Prompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ length: 120 })
  slug: string;

  @Column({ type: 'enum', enum: PromptKind })
  kind: PromptKind;

  @Column({ length: 50, nullable: true })
  roleTarget: string;

  @Column({ length: 50, nullable: true })
  domain: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  currentVersionId: string;

  @Column({
    type: 'enum',
    enum: PromptReleaseLabel,
    default: PromptReleaseLabel.DEV,
  })
  releaseLabel: PromptReleaseLabel;

  @Column({ default: false })
  archived: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
