import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaxType {
  VAT = 'VAT',
  GST = 'GST',
  HST = 'HST',
  PST = 'PST',
  SST = 'SST',
  SALES_TAX = 'SALES_TAX',
  WITHHOLDING = 'WITHHOLDING',
  NONE = 'NONE',
}

@Entity('ca_tax_rates')
@Index(['tenantId', 'countryCode'])
export class CaTaxRate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: TaxType }) taxType: TaxType;
  @Column() countryCode: string;
  @Column({ type: 'decimal', precision: 5, scale: 2 }) rate: number;
  @Column({ nullable: true }) taxAccountCode: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'date', nullable: true }) effectiveFrom: Date | null;
  @Column({ type: 'date', nullable: true }) effectiveTo: Date | null;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
