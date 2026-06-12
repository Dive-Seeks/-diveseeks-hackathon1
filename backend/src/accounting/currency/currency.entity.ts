import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ca_currencies')
export class CaCurrency {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) code: string;
  @Column() name: string;
  @Column() symbol: string;
  @Column() countryCode: string;
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 1 })
  exchangeRateToUSD: number;
  @Column({ default: 2 }) decimalPlaces: number;
  @Column({ default: ',' }) thousandSeparator: string;
  @Column({ default: '.' }) decimalSeparator: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastFetchedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
