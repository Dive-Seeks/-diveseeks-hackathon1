export interface ToolCallContext {
  tenantId: string;
  specialist: string;
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolHandler {
  readonly toolName: string;
  readonly domains: string[];
  execute(ctx: ToolCallContext): Promise<unknown>;
}
