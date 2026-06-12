import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Address } from './address.entity';
import { Director } from './director.entity';
import { BankDetails } from './bank-details.entity';
import { Store } from './store.entity';
import { Site } from '../../sites/entities/site.entity';
import { Department } from '../../departments/entities/department.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Category } from '../../categories/entities/category.entity';
import { Modifier } from '../../modifiers/entities/modifier.entity';
import { Product } from '../../products/entities/product.entity';
import { BusinessSetting } from '../../business-settings/entities/business-setting.entity';
import { BusinessConfiguration } from '../../business-configurations/entities/business-configuration.entity';

export enum BusinessStatus {
  UNSAVED = 'UNSAVED',
  SAVED = 'SAVED',
  SUBMITTED = 'SUBMITTED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
}

@Entity('businesses')
export class Business {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'My Awesome Business' })
  @Column()
  name: string;

  @ApiProperty({ example: 'Awesome Corp Ltd' })
  @Column()
  companyName: string;

  @ApiProperty({ example: 'Limited Company' })
  @Column()
  businessType: string;

  @ApiProperty({ example: '12345678', required: false })
  @Column({ type: 'text', nullable: true })
  registrationNumber: string;

  @ApiProperty({ example: 'contact@awesome.com' })
  @Column()
  companyEmail: string;

  @ApiProperty({ example: '+447700900000' })
  @Column()
  companyPhone: string;

  @ApiProperty({ example: 'United Kingdom' })
  @Column()
  region: string;

  @ApiProperty({ example: 'worldpay', required: false })
  @Column({ type: 'text', nullable: true })
  paymentProvider: string;

  @ApiProperty({ example: 'connected', required: false })
  @Column({ type: 'text', nullable: true })
  paymentProviderStatus: string;

  @ApiProperty({ example: 'pending', required: false })
  @Column({ type: 'text', nullable: true })
  kycStatus: string;

  @ApiProperty({
    example: 'https://hosted.worldpay.com/kyc/...',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  kycLink: string;

  @ApiProperty({
    example: 'fa176a3b-a7e8-4f3d-abe6-5e65626f5994',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  vivaAccountId?: string;

  @ApiProperty({
    example: 'c3073b9d-edd0-49f2-a28d-b7ded8ff9a8b',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  vivaMerchantId?: string;

  @ApiProperty({ example: 'pending' })
  @Column({ default: 'pending' })
  vivaOnboardingStatus:
    | 'pending'
    | 'invited'
    | 'inProgress'
    | 'verified'
    | 'rejected';

  @ApiProperty({ example: false })
  @Column({ default: false })
  vivaIsVerified: boolean;

  @ApiProperty({ example: false })
  @Column({ default: false })
  vivaAcquiringEnabled: boolean;

  @ApiProperty({ example: 'tenant_123', required: false })
  @Column({ type: 'text', nullable: true })
  vivaStateRef?: string;

  @ApiProperty({ enum: BusinessStatus, example: BusinessStatus.ACTIVE })
  @Column({
    type: 'enum',
    enum: BusinessStatus,
    default: BusinessStatus.UNSAVED,
  })
  status: BusinessStatus;

  @ApiProperty({
    enum: ['RETAIL', 'RESTAURANT', 'HYBRID', 'ECOMMERCE'],
    required: false,
  })
  @Column({
    type: 'enum',
    enum: ['RETAIL', 'RESTAURANT', 'HYBRID', 'ECOMMERCE'],
    default: 'RESTAURANT',
  })
  type: 'RETAIL' | 'RESTAURANT' | 'HYBRID' | 'ECOMMERCE';

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Address })
  @OneToOne(() => Address, { cascade: true })
  @JoinColumn({ name: 'registered_address_id' })
  registeredAddress: Address;

  @ApiProperty({ type: () => [Director] })
  @OneToMany(() => Director, (director) => director.business, { cascade: true })
  directors: Director[];

  @ApiProperty({ type: () => BankDetails })
  @OneToOne(() => BankDetails, (bankDetails) => bankDetails.business, {
    cascade: true,
  })
  bankDetails: BankDetails;

  @ApiProperty({ type: () => [Store] })
  @OneToMany(() => Store, (store) => store.business, { cascade: true })
  stores: Store[];

  @ApiProperty({ type: () => [Site] })
  @OneToMany(() => Site, (site) => site.business, { cascade: true })
  sites: Site[];

  @ApiProperty({ type: () => [Department] })
  @OneToMany(
    () => Department,
    (department: Department) => department.business,
    { cascade: true },
  )
  departments: Department[];

  @ApiProperty({ type: () => [Employee] })
  @OneToMany(() => Employee, (employee: Employee) => employee.business, {
    cascade: true,
  })
  employees: Employee[];

  @ApiProperty({ type: () => [Category] })
  @OneToMany(() => Category, (category) => category.business)
  categories: Category[];

  @ApiProperty({ type: () => [Modifier] })
  @OneToMany(() => Modifier, (modifier) => modifier.business)
  modifiers: Modifier[];

  @ApiProperty({ type: () => [Product] })
  @OneToMany(() => Product, (product) => product.business)
  products: Product[];

  @ApiProperty({ type: () => [BusinessSetting] })
  @OneToMany(
    () => BusinessSetting,
    (setting: BusinessSetting) => setting.business,
    { cascade: true },
  )
  settings: BusinessSetting[];

  @ApiProperty({ type: () => [BusinessConfiguration] })
  @OneToMany(
    () => BusinessConfiguration,
    (config: BusinessConfiguration) => config.business,
    { cascade: true },
  )
  configurations: BusinessConfiguration[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
