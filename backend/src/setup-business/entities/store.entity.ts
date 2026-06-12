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
  Index,
} from 'typeorm';
import { Business } from './business.entity';
import { Exclude } from 'class-transformer';
import { Address } from './address.entity';
import { OperatingHour } from './operating-hour.entity';
import { Holiday } from './holiday.entity';

@Entity('stores')
@Index('IDX_stores_allocation_key_unique', ['allocationKey'], { unique: true })
@Index('IDX_stores_place_id_unique', ['placeId'], { unique: true })
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  currency: string;

  @Column({ default: false })
  is_24_7: boolean;

  @Column({ type: 'varchar', name: 'allocation_key', nullable: true })
  allocationKey?: string | null;

  @Column({ type: 'varchar', name: 'place_id', nullable: true })
  placeId?: string | null;

  @Column({ name: 'business_id' })
  businessId: string;

  @Column({ type: 'json', nullable: true })
  selectedChannels?: string[];

  @Exclude()
  @ManyToOne(() => Business, (business) => business.stores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToOne(() => Address, { cascade: true })
  @JoinColumn({ name: 'store_address_id' })
  storeAddress: Address;

  @OneToMany(() => OperatingHour, (hour: OperatingHour) => hour.store, {
    cascade: true,
  })
  operatingHours: OperatingHour[];

  @OneToMany(() => Holiday, (holiday: Holiday) => holiday.store, {
    cascade: true,
  })
  holidays: Holiday[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
