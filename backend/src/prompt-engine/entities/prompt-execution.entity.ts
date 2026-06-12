import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('prompt_executions')
export class PromptExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templateId: string;

  @Column({ type: 'jsonb' })
  inputs: Record<string, any>;

  @Column({ type: 'text' })
  output: string;

  @Column({ type: 'int', nullable: true })
  promptTokens: number;

  @Column({ type: 'int', nullable: true })
  completionTokens: number;

  @Column({ type: 'int', nullable: true })
  latencyMs: number;

  @Column()
  model: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
