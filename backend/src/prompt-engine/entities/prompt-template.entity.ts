import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('prompt_templates')
export class PromptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  template: string;

  @Column({ type: 'jsonb', default: [] })
  inputVariables: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
