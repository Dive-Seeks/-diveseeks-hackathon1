import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CompanyType {
  LTD = 'LTD',
  PLC = 'PLC',
  SOLE_TRADER = 'SOLE_TRADER',
  LLC = 'LLC',
  GMBH = 'GMBH',
  SARL = 'SARL',
  SRL = 'SRL',
  PTY_LTD = 'PTY_LTD',
  SDN_BHD = 'SDN_BHD',
  OTHER = 'OTHER',
}

@Entity('ca_companies')
@Index(['tenantId'], { unique: true })
export class CaCompany {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() name: string;
  @Column({ nullable: true }) registrationNumber: string;
  @Column({ nullable: true }) vatNumber: string;
  @Column({ nullable: true }) taxId: string;
  @Column({ type: 'enum', enum: CompanyType, default: CompanyType.LTD })
  companyType: CompanyType;
  @Column({ default: 'GB' }) countryCode: string;
  @Column({ default: 'GBP' }) baseCurrency: string;
  @Column({ default: '04-01' }) fiscalYearStart: string;
  @Column({ default: '03-31' }) fiscalYearEnd: string;
  @Column({ default: 'standard' }) vatScheme: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
