import { Injectable, Logger } from '@nestjs/common';
import { SpecKitFolderService } from './spec-kit-folder.service';
import { SessionBridgeService } from '../../memory/session-bridge.service';

export interface AuditBridgeParams {
  projectId: string;
  tenantId: string;
  sessionId: string;
  specialist: string;
  taskDescription: string;
  outcome: 'pass' | 'fail' | 'needs_review';
  disciplineOverall: number;
  disciplineFlags: string[];
}

@Injectable()
export class SpecKitAuditBridgeService {
  private readonly logger = new Logger(SpecKitAuditBridgeService.name);

  constructor(
    private readonly folder: SpecKitFolderService,
    private readonly sessionBridge: SessionBridgeService,
  ) {}

  async record(params: AuditBridgeParams): Promise<void> {
    const spec = await this.folder.readSpecKitFile(
      params.projectId,
      'specs/current/spec.md',
    );

    const criteriaResult = spec
      ? this.evaluateCriteria(spec, params.outcome)
      : { met: [], unmet: [] };

    const entry = this.formatEntry(params, criteriaResult);

    await this.folder.appendSpecKitFile(
      params.projectId,
      'memory/audit-log.md',
      entry,
    );

    this.logger.log(
      `[SpecKitAuditBridge] Recorded audit entry for session ${params.sessionId} — outcome=${params.outcome} criteria_met=${criteriaResult.met.length} unmet=${criteriaResult.unmet.length}`,
    );

    // GAP 2 — bridge audit outcome to AgentEpisode memory
    await this.sessionBridge
      .bridgeSpecAudit({
        tenantId: params.tenantId,
        projectId: params.projectId,
        sessionId: params.sessionId,
        specialist: params.specialist,
        outcome: params.outcome,
        metCriteria: criteriaResult.met,
        unmetCriteria: criteriaResult.unmet,
        disciplineFlags: params.disciplineFlags,
      })
      .catch((err) =>
        this.logger.warn(
          `[SpecKitAuditBridge] memory bridge failed: ${(err as Error).message}`,
        ),
      );
  }

  private evaluateCriteria(
    spec: string,
    outcome: string,
  ): { met: string[]; unmet: string[] } {
    // Extract success criteria lines from spec (under "## Success Criteria" section)
    const match = spec.match(
      /##\s*Success Criteria[^\n]*\n([\s\S]*?)(?=\n##|\s*$)/i,
    );
    if (!match) return { met: [], unmet: [] };

    const criteria = match[1]
      .split('\n')
      .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean);

    if (criteria.length === 0) return { met: [], unmet: [] };

    // Simple heuristic: pass outcome = all criteria met, fail = all unmet,
    // needs_review = first half met
    if (outcome === 'pass') {
      return { met: criteria, unmet: [] };
    }
    if (outcome === 'fail') {
      return { met: [], unmet: criteria };
    }
    const half = Math.ceil(criteria.length / 2);
    return { met: criteria.slice(0, half), unmet: criteria.slice(half) };
  }

  private formatEntry(
    params: AuditBridgeParams,
    criteria: { met: string[]; unmet: string[] },
  ): string {
    const ts = new Date().toISOString();
    const metLines = criteria.met.map((c) => `  - [x] ${c}`).join('\n');
    const unmetLines = criteria.unmet.map((c) => `  - [ ] ${c}`).join('\n');
    const flagLines = params.disciplineFlags.map((f) => `  - ${f}`).join('\n');

    return `
---
## ${ts} | ${params.specialist} | ${params.outcome.toUpperCase()}

**Session**: ${params.sessionId}
**Task**: ${params.taskDescription.substring(0, 120)}
**Discipline score**: ${params.disciplineOverall.toFixed(2)}

### Success Criteria
${metLines || '  (none extracted)'}
${unmetLines}

### Discipline Flags
${flagLines || '  (none)'}
`.trimStart();
  }
}
