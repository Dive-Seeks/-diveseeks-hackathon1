export interface DeepReasoningInput {
  taskDescription: string;
  tenantId: string | null;
  taskSessionId: string | null;
  domain?: string;
  triggerType: 'on_demand' | 'tce_gap';
}

export interface DeepReasoningResult {
  source: 'cache' | 'research_queued';
  knowledge: string[];
  tokenCount: number;
  researchJobId: string | null;
}
