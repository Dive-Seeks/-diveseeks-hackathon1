import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Address } from './address.entity';

@Entity('directors')
export class Director {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  dob: string; // Format: DD/MM/YYYY

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.directors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToOne(() => Address, { cascade: true })
  @JoinColumn({ name: 'residential_address_id' })
  residentialAddress: Address;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
