import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tenant_specialist_configs')
@Index(['tenantId', 'specialistId'], { unique: true })
export class TenantSpecialistConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'specialist_id' })
  specialistId: string;

  @Column({ name: 'blocked', default: false })
  blocked: boolean;

  @Column({
    name: 'routing_boost',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 1.0,
  })
  routingBoost: number;

  @Column({ name: 'prompt_append', type: 'text', nullable: true })
  promptAppend: string | null;

  @Column({ name: 'daily_token_cap', type: 'int', nullable: true })
  dailyTokenCap: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
