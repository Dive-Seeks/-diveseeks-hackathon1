import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_usage')
@Index(['tenantId', 'createdAt'])
@Index(['siteId', 'createdAt'])
export class AiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', name: 'site_id', nullable: true })
  siteId: string | null;

  @Column({ name: 'tokens_input' })
  tokensInput: number;

  @Column({ name: 'tokens_output' })
  tokensOutput: number;

  @Column({ name: 'cost_usd', type: 'decimal', precision: 10, scale: 6 })
  costUsd: number;

  @Column({ name: 'model' })
  model: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
