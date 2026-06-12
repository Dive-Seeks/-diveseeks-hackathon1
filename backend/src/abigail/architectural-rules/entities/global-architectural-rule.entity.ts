import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ArchRuleDomain =
  | 'microservices'
  | 'redis'
  | 'monorepo'
  | 'simplicity';
export type ArchRuleSource = 'manual' | 'evolved';

@Entity('global_architectural_rules')
@Index(['isActive', 'domain'])
export class GlobalArchitecturalRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  ruleId: string;

  @Column({ type: 'varchar', length: 30 })
  domain: ArchRuleDomain;

  @Column({ type: 'text', array: true })
  triggerKeywords: string[];

  @Column({ type: 'int' })
  minTier: number;

  @Column({ type: 'int' })
  maxTier: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ type: 'text' })
  counterProposal: string;

  @Column({ default: false })
  requiresVisionOverride: boolean;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source: ArchRuleSource;

  @Column({ type: 'float', nullable: true })
  confidence: number | null;

  @Column({ default: 0 })
  tenantOverrideCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
