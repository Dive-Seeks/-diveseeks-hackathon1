export type HookPoint =
  | 'beforeDispatch'
  | 'afterDispatch'
  | 'beforeLLMRequest'
  | 'afterLLMResponse'
  | 'beforeToolCall'
  | 'afterToolCall'
  | 'beforeMemorySave'
  | 'afterMemorySave'
  | 'beforeAgentRun'
  | 'afterAgentRun'
  | 'onError';

export interface AgentHookContext {
  sessionId: string;
  tenantId: string;
  specialist: string;
  team: string;
  taskDescription: string;
  metadata: Record<string, unknown>;
}

export interface AgentHook {
  readonly name: string;
  readonly hookPoints: HookPoint[];
  readonly priority: number;
  run(point: HookPoint, ctx: AgentHookContext): Promise<void>;
}
