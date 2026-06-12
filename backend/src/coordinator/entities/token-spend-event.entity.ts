import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('token_spend_events')
export class TokenSpendEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string | null; // task_session.id

  @Column({ type: 'varchar', nullable: true })
  jobId: string | null; // coordinator_job.id

  @Column({ type: 'varchar', nullable: true })
  mcpId: string | null; // which MCP spent tokens

  @Column()
  provider: string; // 'openai' | 'anthropic' | 'google'

  @Column()
  model: string; // 'gpt-4o' | 'claude-sonnet-4-6' | etc.

  @Column('int')
  inputTokens: number;

  @Column('int')
  outputTokens: number;

  @Column('int')
  totalTokens: number;

  @Column('int')
  costCents: number; // rounded up, provider rate card

  @CreateDateColumn()
  createdAt: Date;
}
