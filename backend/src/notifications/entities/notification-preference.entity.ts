import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled: boolean;

  @Column({ name: 'push_enabled', default: false })
  pushEnabled: boolean;

  @Column({ name: 'in_app_enabled', default: true })
  inAppEnabled: boolean;

  @Column({ name: 'billing_alerts_enabled', default: true })
  billingAlertsEnabled: boolean;

  @Column({ name: 'security_alerts_enabled', default: true })
  securityAlertsEnabled: boolean;

  @Column({ name: 'product_updates_enabled', default: true })
  productUpdatesEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
