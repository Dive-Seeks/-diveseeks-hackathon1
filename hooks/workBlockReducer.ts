import type { AgentStep, WorkBlockState } from '@/components/ai-chat/workflow-chat/types';

export type WorkBlocksState = Record<number, WorkBlockState>;

export type WorkBlockEvent =
  | { type: 'INIT'; messageIdx: number }
  | { type: 'AGENT_STEP'; agentKey: string; agentName: string; summary: string; stepStatus: AgentStep['status'] }
  | { type: 'CLOSE' }
  | { type: 'ROUTING_COMPLEX'; specialistName: string; specialistRoute: string }
  | { type: 'ROUTING_SPECIALIST'; specialistName: string; specialistRoute: string }
  | { type: 'TOGGLE_EXPANDED'; messageIdx: number };

export function applyWorkBlockEvent(
  state: WorkBlocksState,
  pendingIdx: number | null,
  event: WorkBlockEvent,
): WorkBlocksState {
  switch (event.type) {
    case 'INIT':
      return {
        ...state,
        [event.messageIdx]: { status: 'active', agentSteps: [], expanded: false },
      };

    case 'AGENT_STEP': {
      if (pendingIdx === null) return state;
      const block = state[pendingIdx];
      if (!block) return state;
      const step: AgentStep = {
        agentKey: event.agentKey,
        agentName: event.agentName,
        summary: event.summary,
        status: event.stepStatus,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        [pendingIdx]: { ...block, agentSteps: [...block.agentSteps, step] },
      };
    }

    case 'CLOSE': {
      if (pendingIdx === null) return state;
      const block = state[pendingIdx];
      if (!block) return state;
      return {
        ...state,
        [pendingIdx]: {
          ...block,
          status: 'done',
          agentSteps: block.agentSteps.map((s) =>
            s.status === 'pending' ? { ...s, status: 'done' } : s,
          ),
        },
      };
    }

    case 'ROUTING_COMPLEX': {
      if (pendingIdx === null) return state;
      const block = state[pendingIdx];
      if (!block) return state;
      return {
        ...state,
        [pendingIdx]: {
          ...block,
          routing: 'complex',
          specialistName: event.specialistName,
          specialistRoute: event.specialistRoute,
        },
      };
    }

    case 'ROUTING_SPECIALIST': {
      if (pendingIdx === null) return state;
      const block = state[pendingIdx];
      if (!block) return state;
      return {
        ...state,
        [pendingIdx]: {
          ...block,
          routing: 'specialist',
          specialistName: event.specialistName,
          specialistRoute: event.specialistRoute,
        },
      };
    }

    case 'TOGGLE_EXPANDED': {
      const block = state[event.messageIdx];
      if (!block) return state;
      return {
        ...state,
        [event.messageIdx]: { ...block, expanded: !block.expanded },
      };
    }

    default:
      return state;
  }
}
