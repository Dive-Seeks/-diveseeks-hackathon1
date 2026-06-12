import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('api_fusion_executions')
export class ApiFusionExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  blueprintId: string;

  @Column({ length: 20 })
  calledBy: 'specialist' | 'frontend' | 'cron';

  @Column({ type: 'varchar', length: 50, nullable: true })
  specialistId: string | null;

  @Column({ length: 200 })
  endpoint: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mcpToolName: string | null;
  // set when call came via MCP tool (e.g. 'facebook__get_me')

  @Column('jsonb', { nullable: true })
  requestPayload: object | null;

  @Column('int', { nullable: true })
  responseStatus: number | null;

  @Column('jsonb', { nullable: true })
  responseBody: object | null;

  @Column('int', { nullable: true })
  durationMs: number | null;

  @CreateDateColumn()
  executedAt: Date;
}
