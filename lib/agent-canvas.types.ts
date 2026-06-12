import { Node } from '@xyflow/react';
import { SpecialistIdentity } from './specialist-identities';

export interface AgentNodeData extends Record<string, unknown> {
  id: string;
  identity: SpecialistIdentity;
  status: 'idle' | 'running' | 'done' | 'failed' | 'blocked';
  currentTask?: string;
  activeSince?: string;
  isExpanded: boolean;
}

export interface AgentMessage {
  id: string;
  threadId: string;
  fromAgent: string;
  toAgent: string | null;
  interactionType: string;
  content: string;
  createdAt: string;
}

export type AppNode = Node<AgentNodeData, 'agent'>;

// ── New v2 canvas types ───────────────────────────────────────────────────

export interface CeoSpokeData {
  tasksQueued: number;
  tasksRunning: number;
  tasksDone: number;
  goalsCount: number;
  goalsAvgProgress: number;
  prdActive: number;
  prdTotal: number;
  budgetPct: number;
}

export interface SpecialistEntry {
  id: string;
  displayName: string;
  description: string;
  speciality: string;
  colour: string;
  monogram: string;
  avatarPath: string | null;
  isCustom: boolean;
}

export type SpecialistStatus = 'idle' | 'running' | 'done' | 'failed' | 'needs_review';

export interface AgentResultData {
  outcome: 'done' | 'needs_review' | 'blocked';
  summary: string;
  docSection: string;
  /** Which executor ran the task — 'local' | 'adk' | 'hermes' (absent on older events). */
  executorBackend?: string;
}

export interface ReportOutcome {
  outcome: 'pass' | 'fail' | 'needs_review';
  at: number;
}

export interface CeoNodeData extends Record<string, unknown> {
  coordinatorName: string;
  spokeData: CeoSpokeData;
  speechBubble?: string; // NEW — CEO announcement text
}

export interface CoordinatorNodeData extends Record<string, unknown> {
  name: string;
  monogram: string;
  avatarPath: string | null;
  status: 'idle' | 'running';
  currentTask?: string;
  reading?: boolean; // NEW — true during coordinator_reading phase
}

export interface SpecialistNodeData extends Record<string, unknown> {
  entry: SpecialistEntry;
  status: SpecialistStatus;
  reportOutcome: ReportOutcome | null;
  currentTask?: string;
  agentResult?: AgentResultData; // NEW — populated after agent_complete event
}

export interface AddAgentNodeData extends Record<string, unknown> {
  onAddAgent: (name: string, description: string) => Promise<void>;
}

export interface CanvasGraphInput {
  team: 'coding' | 'general' | 'research';
  coordinatorName: string;
  coordinatorMonogram: string;
  coordinatorStatus: 'idle' | 'running';
  coordinatorCurrentTask?: string;
  specialists: SpecialistEntry[];
  ceoData: CeoSpokeData;
  specialistStatuses: Record<string, SpecialistStatus>;
  specialistCurrentTasks: Record<string, string>;
  reportOutcomes: Record<string, ReportOutcome>;
  onAddAgent: (name: string, description: string) => Promise<void>;
  // Phase pipeline fields
  workflowPhase?: string;
  ceoPlan?: string;
  agentResults?: Record<string, AgentResultData>;
}
