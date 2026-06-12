import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContingencyProbability {
  REMOTE = 'REMOTE',
  POSSIBLE = 'POSSIBLE',
  PROBABLE = 'PROBABLE',
  VIRTUALLY_CERTAIN = 'VIRTUALLY_CERTAIN',
}

export enum ContingencyType {
  LIABILITY = 'LIABILITY',
  ASSET = 'ASSET',
}

@Entity('ca_contingent_liabilities')
export class CaContingentLiability {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenantId: string;
  @Column() description: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedAmount: number | null;
  @Column({ type: 'enum', enum: ContingencyProbability })
  probability: ContingencyProbability;
  @Column({ type: 'enum', enum: ContingencyType })
  contingencyType: ContingencyType;
  @Column({ default: false }) isRecognised: boolean;
  @Column({ nullable: true }) disclosureNote: string;

  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
