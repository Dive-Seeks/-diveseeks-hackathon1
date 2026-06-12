import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BillingInvoice } from './billing-invoice.entity';

@Entity('tenant_billing_profiles')
export class BillingProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'plan_name', default: 'Starter' })
  planName: string;

  @Column({ name: 'billing_email' })
  billingEmail: string;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'billing_cycle', default: 'monthly' })
  billingCycle: string;

  @Column({ name: 'next_billing_date', type: 'timestamp', nullable: true })
  nextBillingDate: Date | null;

  @Column({
    name: 'outstanding_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  outstandingAmount: string;

  @Index()
  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ name: 'provider_customer_id', type: 'varchar', nullable: true })
  providerCustomerId: string | null;

  @OneToMany(() => BillingInvoice, (invoice) => invoice.billingProfile)
  invoices: BillingInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
