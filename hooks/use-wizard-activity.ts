import * as React from 'react';

export type AbigailState = 'idle' | 'thinking' | 'planning' | 'waiting' | 'responding';

export interface ActiveSpecialist {
  name: 'zara' | 'marco' | 'kai' | 'rex' | 'sage';
  state: 'thinking' | 'planning';
  startedAt: number;
}

const SPECIALIST_TOOL_NAMES = new Set(['callZara', 'callMarco', 'callKai', 'callRex', 'callSage']);
const PLANNING_TOOL_NAMES = new Set(['detectJourney', 'updateDiscoveryFacts', 'recordApproval', 'recordRejection', 'recordHygieneAnswers']);

function toolNameToSpecialist(toolName: string): ActiveSpecialist['name'] | null {
  // e.g. "callZara" → "zara"
  const match = toolName.match(/^call([A-Z][a-z]+)$/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (['zara', 'marco', 'kai', 'rex', 'sage'].includes(name)) {
    return name as ActiveSpecialist['name'];
  }
  return null;
}

export function useWizardActivity(
  coordinatorMessages: any[],
  coordinatorStatus: string,
) {
  // Track when each specialist first appeared — stable across re-renders
  const specialistStartTimes = React.useRef<Record<string, number>>({});

  const abigailState = React.useMemo<AbigailState>(() => {
    if (coordinatorStatus === 'submitted') return 'thinking';
    if (coordinatorStatus !== 'streaming' && coordinatorStatus !== 'submitted') {
      return 'idle';
    }
    const last = coordinatorMessages[coordinatorMessages.length - 1];
    if (!last) return 'thinking';
    const parts: any[] = last.parts ?? [];

    const hasSpecialistInFlight = parts.some(
      p => SPECIALIST_TOOL_NAMES.has(p.toolName) && p.type === 'tool-invocation' && !('result' in p)
    );
    if (hasSpecialistInFlight) return 'waiting';

    const hasSpecialistResult = parts.some(
      p => SPECIALIST_TOOL_NAMES.has(p.toolName) && p.type === 'tool-result'
    );
    if (hasSpecialistResult) return 'responding';

    const hasPlanningInFlight = parts.some(
      p => PLANNING_TOOL_NAMES.has(p.toolName) && p.type === 'tool-invocation' && !('result' in p)
    );
    if (hasPlanningInFlight) return 'planning';

    return 'thinking';
  }, [coordinatorMessages, coordinatorStatus]);

  const activeSpecialists = React.useMemo<ActiveSpecialist[]>(() => {
    if (coordinatorStatus !== 'streaming') return [];
    const last = coordinatorMessages[coordinatorMessages.length - 1];
    if (!last) return [];
    const parts: any[] = last.parts ?? [];

    const inFlight = parts.filter(
      p => SPECIALIST_TOOL_NAMES.has(p.toolName) && p.type === 'tool-invocation' && !('result' in p)
    );

    return inFlight
      .map((p): ActiveSpecialist | null => {
        const name = toolNameToSpecialist(p.toolName);
        if (!name) return null;
        // Record first-seen time only once per specialist name
        if (!specialistStartTimes.current[name]) {
          specialistStartTimes.current[name] = Date.now();
        }
        return {
          name,
          state: 'thinking' as const,
          startedAt: specialistStartTimes.current[name],
        };
      })
      .filter((s): s is ActiveSpecialist => s !== null);
  }, [coordinatorMessages, coordinatorStatus]);

  // Clear start times when specialists finish ('ready' is the AI SDK's idle equivalent)
  React.useEffect(() => {
    if (coordinatorStatus !== 'streaming' && coordinatorStatus !== 'submitted') {
      specialistStartTimes.current = {};
    }
  }, [coordinatorStatus]);

  return { abigailState, activeSpecialists };
}
