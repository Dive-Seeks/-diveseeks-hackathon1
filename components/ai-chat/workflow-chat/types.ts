import type { ChatMessage } from '@/hooks/useAbigailChat';

export type ModelTier = 'fast' | 'balanced' | 'deep';

export interface Citation {
  id: string;
  title: string;
  specialistId: string;
  snippet: string;
}

export interface AgentStep {
  agentKey: string;
  agentName: string;
  summary: string;
  status: 'pending' | 'done' | 'error';
  timestamp: string;
}

export interface WorkBlockState {
  status: 'active' | 'done' | 'error';
  agentSteps: AgentStep[];
  routing?: 'complex' | 'specialist';
  specialistName?: string;
  specialistRoute?: string;
  expanded: boolean;
}

export interface WorkflowChatMessage extends ChatMessage {
  id: string;
  workBlock?: WorkBlockState;
  hidden?: boolean;
  thinkingMs?: number;
  citations?: Citation[];
  followUps?: string[];
}
