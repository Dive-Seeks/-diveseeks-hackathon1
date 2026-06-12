import { create } from 'zustand';
import {
  CeoSpokeData,
  SpecialistEntry,
  SpecialistStatus,
  ReportOutcome,
  AgentResultData,
} from './agent-canvas.types';

export const EMPTY_SPOKES: CeoSpokeData = {
  tasksQueued: 0, tasksRunning: 0, tasksDone: 0,
  goalsCount: 0, goalsAvgProgress: 0,
  prdActive: 0, prdTotal: 0, budgetPct: 0,
};

export interface CanvasLiveState {
  coordinatorName: string;
  coordinatorMonogram: string;
  coordinatorStatus: 'idle' | 'running';
  coordinatorCurrentTask?: string;
  ceoData: CeoSpokeData;
  specialists: SpecialistEntry[];
  specialistStatuses: Record<string, SpecialistStatus>;
  specialistCurrentTasks: Record<string, string>;
  reportOutcomes: Record<string, ReportOutcome>;
  running: boolean;
  paused: boolean;
  // Phase pipeline additions
  workflowPhase?: 'idle' | 'ceo_speaking' | 'coordinator_reading' | 'agent_assigned' | 'workflow_done' | 'workflow_paused' | 'workflow_resumed' | 'workflow_resumed_after_interrupt';
  ceoPlan?: string;
  agentResults?: Record<string, AgentResultData>;
  completionReport?: string;
  completedCount?: number;
  totalCount?: number;
  needsReviewCount?: number;
  blockedCount?: number;
  syntheticMessages?: Array<{ id: string; content: string; createdAt: number }>;
  reportCompiling?: boolean;
  reportReady?: boolean;
  reportId?: string;
}

export function emptyCanvasState(specialists: SpecialistEntry[] = []): CanvasLiveState {
  return {
    coordinatorName: 'Abigail AI',
    coordinatorMonogram: 'AI',
    coordinatorStatus: 'idle',
    coordinatorCurrentTask: undefined,
    ceoData: EMPTY_SPOKES,
    specialists,
    specialistStatuses: {},
    specialistCurrentTasks: {},
    reportOutcomes: {},
    running: false,
    paused: false,
  };
}

interface CanvasStore {
  // Per-project live state survives view toggles AND full page unmount/remount.
  byProject: Record<string, CanvasLiveState>;
  ensure: (projectId: string, init: CanvasLiveState) => void;
  update: (projectId: string, fn: (prev: CanvasLiveState) => CanvasLiveState) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  byProject: {},
  ensure: (projectId, init) =>
    set((s) =>
      s.byProject[projectId]
        ? s
        : { byProject: { ...s.byProject, [projectId]: init } },
    ),
  update: (projectId, fn) =>
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: fn(s.byProject[projectId] ?? emptyCanvasState()),
      },
    })),
}));
