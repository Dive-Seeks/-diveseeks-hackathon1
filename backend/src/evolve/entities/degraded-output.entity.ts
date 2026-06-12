import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('degraded_outputs')
export class DegradedOutput {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid', { nullable: true })
  taskSessionId: string | null;

  @Column({ length: 50 })
  specialistId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelUsed: string | null;

  @Column('int')
  detectionLayer: number;

  @Column('text', { nullable: true })
  reason: string | null;

  @Column({ default: false })
  escalated: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
