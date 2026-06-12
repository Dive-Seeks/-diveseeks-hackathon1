import { Injectable, Logger } from '@nestjs/common';

export interface HumanWatchSession {
  taskSessionId: string;
  requirementId: string;
  watchSelectors: string[];
  startedAt: Date;
  domEventLog: unknown[];
  attrChangeLog: unknown[];
  ariaSnapshots: string[];
}

@Injectable()
export class DomWatcherService {
  private readonly logger = new Logger(DomWatcherService.name);
  private readonly sessions = new Map<string, HumanWatchSession>();

  startHumanWatch(
    taskSessionId: string,
    requirementId: string,
    watchSelectors: string[],
  ): HumanWatchSession {
    const session: HumanWatchSession = {
      taskSessionId,
      requirementId,
      watchSelectors,
      startedAt: new Date(),
      domEventLog: [],
      attrChangeLog: [],
      ariaSnapshots: [],
    };
    this.sessions.set(requirementId, session);
    this.logger.log(
      `Human watch started for requirement ${requirementId} (selectors: ${watchSelectors.join(', ')})`,
    );
    return session;
  }

  completeHumanWatch(
    requirementId: string,
    domEventLog?: unknown[],
    attrChangeLog?: unknown[],
    ariaSnapshots?: string[],
  ): HumanWatchSession | null {
    const session = this.sessions.get(requirementId);
    if (!session) {
      this.logger.warn(
        `No active watch session found for requirement ${requirementId}`,
      );
      return null;
    }
    if (domEventLog?.length) session.domEventLog.push(...domEventLog);
    if (attrChangeLog?.length) session.attrChangeLog.push(...attrChangeLog);
    if (ariaSnapshots?.length) session.ariaSnapshots.push(...ariaSnapshots);
    this.sessions.delete(requirementId);
    this.logger.log(`Human watch completed for requirement ${requirementId}`);
    return session;
  }

  isWatching(requirementId: string): boolean {
    return this.sessions.has(requirementId);
  }

  getSession(requirementId: string): HumanWatchSession | undefined {
    return this.sessions.get(requirementId);
  }
}
