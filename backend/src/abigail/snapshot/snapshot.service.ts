import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SpecialistHealth {
  specialist: string;
  status: 'active' | 'idle' | 'overloaded' | 'offline';
  load: number;
  error_rate: number;
  last_used: string;
  next_action: string;
}

export interface TeamHealthSnapshot {
  specialists: SpecialistHealth[];
}

const SPECIALIST_IDS = [
  'rex',
  'nova',
  'kai',
  'sage',
  'atlas',
  'orion',
  'pixel',
  'luma',
  'felix',
  'vex',
];

@Injectable()
export class SnapshotService implements OnModuleInit {
  private readonly logger = new Logger(SnapshotService.name);
  private readonly memoryDir = path.join(process.cwd(), 'memory', 'projects');
  private readonly _cache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  async onModuleInit() {
    await fs.mkdir(this.memoryDir, { recursive: true });
  }

  private getCached<T>(key: string): T | null {
    const entry = this._cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T, ttlMs: number): void {
    this._cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private snapshotPath(projectId: string): string {
    return path.join(this.memoryDir, `${projectId}-health.tsv`);
  }

  async getSnapshot(projectId: string): Promise<TeamHealthSnapshot> {
    const cached = this.getCached<TeamHealthSnapshot>(projectId);
    if (cached) return cached;

    const filePath = this.snapshotPath(projectId);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const lines = raw
        .split('\n')
        .filter((l) => l && !l.startsWith('specialist'));
      const specialists: SpecialistHealth[] = lines.map((line) => {
        const [specialist, status, load, error_rate, last_used, next_action] =
          line.split('\t');
        return {
          specialist,
          status: status as SpecialistHealth['status'],
          load: parseInt(load, 10),
          error_rate: parseFloat(error_rate),
          last_used,
          next_action,
        };
      });
      const snapshot = { specialists };
      this.setCached(projectId, snapshot, 60 * 1000); // 60s TTL
      return snapshot;
    } catch {
      return this.defaultSnapshot();
    }
  }

  async updateSpecialistLoad(
    projectId: string,
    specialistId: string,
    delta: number,
  ): Promise<void> {
    const snapshot = await this.getSnapshot(projectId);
    const entry = snapshot.specialists.find(
      (s) => s.specialist === specialistId,
    );
    if (entry) {
      entry.load = Math.max(0, entry.load + delta);
      entry.last_used = new Date().toISOString().split('T')[0];
      entry.status =
        entry.load === 0 ? 'idle' : entry.load > 5 ? 'overloaded' : 'active';
    }
    await this.writeSnapshot(projectId, snapshot);
  }

  async recordTaskOutcome(
    projectId: string,
    specialistId: string,
    success: boolean,
  ): Promise<void> {
    const snapshot = await this.getSnapshot(projectId);
    const entry = snapshot.specialists.find(
      (s) => s.specialist === specialistId,
    );
    if (entry) {
      // Rolling update: simple exponential smoothing on error_rate
      const outcome = success ? 0 : 1;
      entry.error_rate =
        Math.round((entry.error_rate * 0.9 + outcome * 0.1) * 1000) / 1000;
    }
    await this.writeSnapshot(projectId, snapshot);
  }

  async recordSnapshot(
    projectId: string,
    data: {
      specialistId: string;
      taskOutcome: 'success' | 'fail' | 'needs_review';
      responseTime: number;
    },
  ): Promise<void> {
    const snapshot = await this.getSnapshot(projectId);
    const entry = snapshot.specialists.find(
      (s) => s.specialist === data.specialistId,
    );
    if (entry) {
      // Update error rate based on outcome
      const isFail = data.taskOutcome === 'fail';
      const outcome = isFail ? 1 : 0;
      entry.error_rate =
        Math.round((entry.error_rate * 0.9 + outcome * 0.1) * 1000) / 1000;

      // Reduce load since task is done
      entry.load = Math.max(0, entry.load - 1);
      entry.last_used = new Date().toISOString().split('T')[0];
      entry.status = entry.load === 0 ? 'idle' : 'active';

      this.logger.log(
        `Snapshot recorded for ${data.specialistId} in project ${projectId}. Load: ${entry.load}, Error Rate: ${entry.error_rate}`,
      );
    }
    await this.writeSnapshot(projectId, snapshot);
  }

  private async writeSnapshot(
    projectId: string,
    snapshot: TeamHealthSnapshot,
  ): Promise<void> {
    const filePath = this.snapshotPath(projectId);
    const header =
      'specialist\tstatus\tload\terror_rate\tlast_used\tnext_action';
    const lines = snapshot.specialists.map(
      (s) =>
        `${s.specialist}\t${s.status}\t${s.load}\t${s.error_rate}\t${s.last_used}\t${s.next_action}`,
    );
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, [header, ...lines].join('\n'), 'utf-8');
    await fs.rename(tmp, filePath);

    this._cache.delete(projectId);
  }

  private defaultSnapshot(): TeamHealthSnapshot {
    const today = new Date().toISOString().split('T')[0];
    return {
      specialists: SPECIALIST_IDS.map((id) => ({
        specialist: id,
        status: 'idle',
        load: 0,
        error_rate: 0,
        last_used: today,
        next_action: 'none',
      })),
    };
  }
}
