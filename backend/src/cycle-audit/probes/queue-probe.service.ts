import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueProbeService {
  private readonly queueNames = [
    'brain-loop',
    'task-manager',
    'api-fusion',
    'audit-loop',
    'data-engine',
    'workflow-engine',
    'knowledge-synthesis',
    'geo-refinement',
    'route-refinement',
    'brain-memory',
    'email',
    'menu-image-generation',
    'night-team',
    'wakeup-queue',
  ];

  constructor(private readonly moduleRef: ModuleRef) {}

  async run(): Promise<{
    queueResults: Record<
      string,
      { waiting: number; active: number; failed: number }
    >;
    alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }>;
  }> {
    const queueResults: Record<string, any> = {};
    const alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }> = [];

    await Promise.all(
      this.queueNames.map(async (name) => {
        try {
          const queue = this.moduleRef.get<Queue>(getQueueToken(name), {
            strict: false,
          });
          if (queue) {
            const counts = await queue.getJobCounts(
              'waiting',
              'active',
              'failed',
            );
            queueResults[name] = counts;

            if (counts.failed > 50) {
              alerts.push({
                probe: `queue:${name}`,
                severity: 'critical',
                message: `Queue ${name} has ${counts.failed} failed jobs`,
              });
            } else if (counts.failed > 10) {
              alerts.push({
                probe: `queue:${name}`,
                severity: 'degraded',
                message: `Queue ${name} has ${counts.failed} failed jobs`,
              });
            }

            if (counts.waiting > 100) {
              alerts.push({
                probe: `queue:${name}`,
                severity: 'degraded',
                message: `Queue ${name} has ${counts.waiting} waiting jobs`,
              });
            }
          }
        } catch (_error) {
          // Queue might not be initialized in this instance
        }
      }),
    );

    return {
      queueResults,
      alerts,
    };
  }
}
