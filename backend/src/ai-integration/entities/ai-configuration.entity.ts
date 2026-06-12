import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type AiProvider = 'openai' | 'groq' | 'openrouter' | 'google' | 'deepseek';
export type AiContext = 'pos' | 'coding';

@Entity('ai_configurations')
export class AiConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Which product this config belongs to — 'pos' or 'coding' */
  @Column({ name: 'context', default: 'pos' })
  context: AiContext;

  /** Active provider for chat requests */
  @Column({ name: 'provider', default: 'openai' })
  provider: AiProvider;

  /** Default model to use (provider-specific) */
  @Column({ name: 'model', default: 'gpt-4o' })
  model: string;

  /** Abigail's personality tone */
  @Column({ name: 'tone', default: 'professional' })
  tone: 'professional' | 'friendly' | 'casual';

  /** Monthly budget in USD for Abigail AI services */
  @Column({
    name: 'monthly_budget_usd',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 62.0,
  })
  monthlyBudgetUsd: number;

  /** Current month spending */
  @Column({
    name: 'current_spending_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  currentSpendingUsd: number;

  @Column({ name: 'openai_api_key', type: 'text', nullable: true })
  openaiApiKey: string | null;

  @Column({ name: 'groq_api_key', type: 'text', nullable: true })
  groqApiKey: string | null;

  @Column({ name: 'openrouter_api_key', type: 'text', nullable: true })
  openRouterApiKey: string | null;

  @Column({ name: 'google_api_key', type: 'text', nullable: true })
  googleApiKey: string | null;

  @Column({ name: 'deepseek_api_key', type: 'text', nullable: true })
  deepseekApiKey: string | null;

  /** Specialist-specific BYOK override — null means team-wide key applies */
  @Column({ name: 'specialist_id', type: 'varchar', nullable: true })
  specialistId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
