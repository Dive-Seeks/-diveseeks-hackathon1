import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',
  TENANT = 'tenant',
  MANAGER = 'manager',
  CASHIER = 'cashier',
}

export const STORE_RECORD_ACCESS_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.ADMIN,
  UserRole.TENANT,
  UserRole.MANAGER,
]);

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  storeId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TENANT,
  })
  role: UserRole;

  @Column({ default: true })
  isVerified: boolean;

  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  @Column({ default: false })
  isCoder: boolean;

  @Column({ default: true })
  isBusiness: boolean;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockUntil: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
