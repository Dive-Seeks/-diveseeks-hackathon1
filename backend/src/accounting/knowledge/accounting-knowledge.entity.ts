import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type KnowledgeDomain =
  | 'transaction'
  | 'reconciliation'
  | 'reporting'
  | 'assets'
  | 'company'
  | 'partnership'
  | 'policy';
export type KnowledgeRuleType =
  | 'journal_pattern'
  | 'reconciliation_rule'
  | 'policy';

@Entity('accounting_knowledge')
@Index(['domain', 'businessType', 'active'])
@Index(['ruleType', 'active'])
export class AccountingKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  domain: string; // KnowledgeDomain

  @Column({ default: '*' })
  businessType: string; // 'restaurant' | 'retail' | 'ecommerce' | '*'

  @Column()
  ruleType: string; // KnowledgeRuleType

  @Column({ type: 'jsonb' })
  ruleData: object; // JournalPattern | ReconciliationRule | AccountingPolicy

  @Column({ type: 'float' })
  confidence: number; // AutoData verification score 0–1

  @Column()
  sourceBook: string; // e.g. "Frank Wood 15th Ed"

  @Column({ default: '' })
  sourceChapter: string;

  @Column({ default: true })
  active: boolean; // false = below confidence threshold, awaiting CA review

  @CreateDateColumn()
  extractedAt: Date;

  @Column({ nullable: true, type: 'varchar' })
  reviewedBy: string | null; // CA who validated this rule

  @Column({ nullable: true, type: 'timestamptz' })
  reviewedAt: Date | null;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
