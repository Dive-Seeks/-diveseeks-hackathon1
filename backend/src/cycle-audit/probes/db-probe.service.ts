import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DbProbeService {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<{
    ok: boolean;
    latencyMs: number;
    alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }>;
  }> {
    const start = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      await this.dataSource.query('SELECT 1');
      const latencyMs = Date.now() - start;

      const alerts: Array<{
        probe: string;
        severity: 'critical' | 'degraded';
        message: string;
      }> = [];
      if (latencyMs > 200) {
        alerts.push({
          probe: 'db',
          severity: 'degraded',
          message: `High DB latency: ${latencyMs}ms`,
        });
      }

      return {
        ok: true,
        latencyMs,
        alerts,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        alerts: [
          {
            probe: 'db',
            severity: 'critical' as const,
            message: `DB check failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
