import { Injectable, Logger } from '@nestjs/common';
import { SalesGateway } from '../../gateways/sales/sales.gateway';
import { AdkPhaseEvent } from './adk-event.types';

const KNOWN = new Set([
  'coordinator_reading',
  'agent_assigned',
  'agent_complete',
  'workflow_done',
  'workflow_recovery_started',
  'workflow_recovery_completed',
  'workflow_paused',
  'workflow_resumed_after_interrupt',
]);

@Injectable()
export class AdkEventTranslatorService {
  private readonly logger = new Logger(AdkEventTranslatorService.name);
  constructor(private readonly gateway: SalesGateway) {}

  handle(evt: AdkPhaseEvent): void {
    if (!KNOWN.has(evt.phase)) {
      this.logger.warn(`[adk-events] unknown phase: ${evt.phase}`);
      return;
    }
    const { projectId, tenantId, runId, phase, ...rest } = evt;
    // Strip undefined keys so the emitted payload matches the BullMQ path exactly.
    const payload: Record<string, unknown> = { phase };
    for (const [k, v] of Object.entries(rest))
      if (v !== undefined) payload[k] = v;
    this.gateway.emitWorkflowPhase(projectId, payload as any);
  }
}
