import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('specialist_model_overrides')
@Unique(['tenantId', 'specialistId'])
export class SpecialistModelOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ length: 50 })
  specialistId: string;

  @Column({ length: 20 })
  provider: string;

  @Column({ length: 100 })
  model: string;

  @Column('text', { nullable: true })
  apiKeyEncrypted: string | null;

  @Column('text', { nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
