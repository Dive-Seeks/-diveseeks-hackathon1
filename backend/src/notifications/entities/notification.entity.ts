import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_notifications')
@Index('IDX_USER_NOTIFICATIONS_USER_READ_CREATED', [
  'userId',
  'isRead',
  'createdAt',
])
@Index('IDX_USER_NOTIFICATIONS_TENANT_CREATED', ['tenantId', 'createdAt'])
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'system' })
  type: string;

  @Column({ default: 'in_app' })
  channel: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ name: 'action_url', type: 'varchar', nullable: true })
  actionUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
