import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('account_preferences')
export class AccountPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ default: 'system' })
  theme: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'en' })
  language: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
