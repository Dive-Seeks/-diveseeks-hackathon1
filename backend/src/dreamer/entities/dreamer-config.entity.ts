import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dreamer_configs')
@Index(['tenantId'], { unique: true })
export class DreamerConfig {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenantId: string;
  @Column({ default: '30 2 * * *' }) cronExpression: string;
  @Column({ default: true }) enabled: boolean;
  @UpdateDateColumn() updatedAt: Date;
}
