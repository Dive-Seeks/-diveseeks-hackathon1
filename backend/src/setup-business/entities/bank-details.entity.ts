import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('bank_details')
export class BankDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  encryptedPayload: string;

  @Column({ type: 'jsonb' })
  maskedPreview: any; // { accountNumber: '****5678' }

  @Column({ name: 'business_id' })
  businessId: string;

  @OneToOne(() => Business, (business) => business.bankDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
