import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  REDUCING_BALANCE = 'REDUCING_BALANCE',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION',
}

@Entity('ca_depreciation_schedules')
export class CaDepreciationSchedule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenantId: string;
  @Column({ type: 'uuid' }) assetAccountId: string;
  @Column() assetName: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) costPrice: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  residualValue: number;
  @Column({ type: 'decimal', precision: 5, scale: 4 }) annualRate: number;
  @Column({ type: 'enum', enum: DepreciationMethod })
  method: DepreciationMethod;
  @Column({ type: 'int', nullable: true }) usefulLifeYears: number | null;
  @Column({ type: 'date' }) acquisitionDate: Date;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  accumulatedDepreciation: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) netBookValue: number;
  @Column({ default: true }) isActive: boolean;

  @OneToMany(() => CaDepreciationEntry, (e) => e.schedule)
  entries: CaDepreciationEntry[];

  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('ca_depreciation_entries')
export class CaDepreciationEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) scheduleId: string;
  @Column({ type: 'date' }) periodDate: Date;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) charge: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) closingNBV: number;
  @Column({ type: 'uuid', nullable: true }) journalEntryId: string | null;

  @ManyToOne(() => CaDepreciationSchedule, (s) => s.entries)
  schedule: CaDepreciationSchedule;

  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
