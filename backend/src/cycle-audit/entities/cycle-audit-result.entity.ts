import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cycle_audit_results')
export class CycleAuditResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  ranAt: Date;

  @Column({ type: 'int' })
  durationMs: number;

  @Column({ type: 'varchar', length: 16 })
  overallStatus: 'healthy' | 'degraded' | 'critical';

  @Column({ type: 'float', nullable: true })
  httpP95Ms: number | null;

  @Column({ type: 'float', nullable: true })
  httpErrorRate: number | null;

  @Column({ type: 'jsonb', nullable: true })
  queueResults: Record<
    string,
    { waiting: number; active: number; failed: number }
  > | null;

  @Column({ type: 'boolean', nullable: true })
  redisOk: boolean | null;

  @Column({ type: 'int', nullable: true })
  redisLatencyMs: number | null;

  @Column({ type: 'int', nullable: true })
  dbLatencyMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  llmResults: {
    server: Record<string, { status: string; latencyMs?: number }>;
    tenantKeys: Record<
      string,
      { provider: string; status: string; latencyMs?: number }
    >;
  } | null;

  @Column({ type: 'jsonb', default: [] })
  alerts: Array<{
    probe: string;
    severity: 'critical' | 'degraded';
    message: string;
  }>;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null; // null = system-level row
}
