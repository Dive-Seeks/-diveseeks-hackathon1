import { Injectable, Logger } from '@nestjs/common';
import { ToolHandler, ToolCallContext } from './tool-handler.interface';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.tools.set(handler.toolName, handler);
    this.logger.log(
      `Registered tool: ${handler.toolName} (domains: [${handler.domains.join(', ') || 'all'}])`,
    );
  }

  async call(toolName: string, ctx: ToolCallContext): Promise<unknown> {
    const handler = this.tools.get(toolName);
    if (!handler) throw new Error(`Tool not found: ${toolName}`);
    return handler.execute(ctx);
  }

  getToolsFor(domain: string): ToolHandler[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.domains.length === 0 || t.domains.includes(domain),
    );
  }

  list(): { toolName: string; domains: string[] }[] {
    return Array.from(this.tools.values()).map((t) => ({
      toolName: t.toolName,
      domains: t.domains,
    }));
  }
}
