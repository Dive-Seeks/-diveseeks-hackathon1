import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BillingProfile } from './billing.entity';

@Entity('billing_invoices')
@Index('IDX_BILLING_INVOICES_TENANT_ISSUED', ['tenantId', 'issuedAt'])
@Index('IDX_BILLING_INVOICES_TENANT_STATUS', ['tenantId', 'status'])
export class BillingInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'billing_profile_id', type: 'uuid' })
  billingProfileId: string;

  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'issued_at', type: 'timestamp' })
  issuedAt: Date;

  @Column({ name: 'due_at', type: 'timestamp', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'provider_invoice_id', type: 'varchar', nullable: true })
  providerInvoiceId: string | null;

  @Column({ name: 'download_url', type: 'text', nullable: true })
  downloadUrl: string | null;

  @ManyToOne(
    () => BillingProfile,
    (billingProfile) => billingProfile.invoices,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'billing_profile_id' })
  billingProfile: BillingProfile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
