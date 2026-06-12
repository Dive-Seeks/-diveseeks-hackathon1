export const AGENT_MESSAGE_CHANNEL = 'agent:message';

export type InteractionType =
  | 'job_started'
  | 'job_completed'
  | 'follow_ups_ready'
  | 'delegation_request'
  | 'delegation_response'
  | 'audit_phase'
  | 'hermes_alert'
  | 'soul_report'
  | 'coordinator_decision'
  | 'brainstorm_request'
  | 'brainstorm_result'
  | 'parametric_weight'
  | 'deep_reasoning';

export interface AgentCitation {
  id: string;
  title: string;
  specialistId: string;
  snippet: string;
}

export interface AgentMessageEvent {
  tenantId: string;
  projectId: string;
  threadId: string;
  fromAgent: string;
  toAgent?: string;
  domain: string;
  interactionType: InteractionType;
  content: string;
  metadata?: {
    thinkingMs?: number;
    citations?: AgentCitation[];
    followUps?: string[];
    [key: string]: unknown;
  };
}
