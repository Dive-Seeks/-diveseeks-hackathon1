import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('api_fusion_test_results')
export class ApiFusionTestResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  blueprintId: string;

  @Column('uuid', { nullable: true })
  tenantId: string | null;

  @Column({ length: 200 })
  endpoint: string; // 'GET /me'

  @Column({ length: 10 })
  status: 'pass' | 'fail' | 'skipped';

  @Column('int', { nullable: true })
  statusCode: number | null;

  @Column('int', { nullable: true })
  responseTimeMs: number | null;

  @Column('text', { nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  testedAt: Date;
}
