import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AddressType {
  REGISTERED = 'REGISTERED',
  RESIDENTIAL = 'RESIDENTIAL',
  SITE = 'SITE',
}

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  street: string;

  @Column()
  locality: string;

  @Column()
  region: string;

  @Column()
  postalCode: string;

  @Column({
    type: 'enum',
    enum: AddressType,
    default: AddressType.REGISTERED,
  })
  type: AddressType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
