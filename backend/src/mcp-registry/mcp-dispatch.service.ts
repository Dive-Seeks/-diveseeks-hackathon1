import { Injectable, Logger } from '@nestjs/common';
import { McpServerRegistration } from './entities/mcp-server-registration.entity';
import { McpVaultService } from './mcp-vault.service';

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const {
  StdioClientTransport,
} = require('@modelcontextprotocol/sdk/client/stdio.js');

export interface McpToolCallResult {
  success: boolean;
  toolName: string;
  output?: unknown;
  error?: string;
  durationMs: number;
}

@Injectable()
export class McpDispatchService {
  private readonly logger = new Logger(McpDispatchService.name);
  private readonly CALL_TIMEOUT_MS = 30_000;

  constructor(private readonly vault: McpVaultService) {}

  async callCapability(
    mcp: McpServerRegistration,
    capability: string,
    context: Record<string, unknown>,
    toolPolicy?: { allow: string[]; deny: string[] } | null,
  ): Promise<McpToolCallResult> {
    const start = Date.now();

    // 1. Resolve tool name: pick the first toolsAvailable entry that matches the capability tag
    const toolName = this.resolveToolName(mcp, capability);
    if (!toolName) {
      this.logger.warn(
        `No tool match for capability="${capability}" on MCP ${mcp.mcpId}. Query POST /coordinator/tools/discover for catalog.`,
      );
      return {
        success: false,
        toolName: '',
        error: `No tool found for capability "${capability}" on MCP "${mcp.mcpId}". Query /coordinator/tools/discover for catalog.`,
        durationMs: Date.now() - start,
      };
    }

    // [OC-4] Tool Policy Enforcement
    if (toolPolicy?.deny?.includes(toolName)) {
      return {
        success: false,
        toolName,
        error: `Tool "${toolName}" is denied by job tool policy`,
        durationMs: Date.now() - start,
      };
    }

    if (toolPolicy?.allow && !toolPolicy.allow.includes(toolName)) {
      return {
        success: false,
        toolName,
        error: `Tool "${toolName}" is not explicitly allowed by job tool policy`,
        durationMs: Date.now() - start,
      };
    }

    // 2. Retrieve LLM API key from vault if the MCP registered one
    let injectedEnv: Record<string, string> = {};
    if (mcp.llmKeyId) {
      try {
        const llmKey = await this.vault.retrieveKey(mcp.mcpId);
        injectedEnv = { LLM_API_KEY: llmKey };
      } catch {
        this.logger.warn(
          `No vault key for MCP ${mcp.mcpId} — proceeding without LLM_API_KEY`,
        );
      }
    }

    // 3. Open stdio transport (same pattern as McpValidatorService — already proven)
    const [cmd, ...args] = mcp.command.split(' ');
    const transport = new StdioClientTransport({
      command: cmd,
      args,
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([, v]) => v !== undefined),
        ),
        ...mcp.envVars,
        ...injectedEnv,
      } as Record<string, string>,
    });

    const client = new Client(
      { name: `diveseeks-brain-${mcp.mcpId}`, version: '1.0.0' },
      { capabilities: {} },
    );

    try {
      await Promise.race([
        client.connect(transport),
        this.timeout(this.CALL_TIMEOUT_MS, `connect to MCP ${mcp.mcpId}`),
      ]);

      const result = await Promise.race([
        client.callTool({ name: toolName, arguments: context }),
        this.timeout(
          this.CALL_TIMEOUT_MS,
          `tool call ${toolName} on ${mcp.mcpId}`,
        ),
      ]);

      this.logger.log(
        `MCP dispatch success: ${mcp.mcpId}.${toolName} (${Date.now() - start}ms)`,
      );

      return {
        success: true,
        toolName,
        output: result,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(
        `MCP dispatch failed: ${mcp.mcpId}.${toolName} — ${message}`,
      );
      return {
        success: false,
        toolName,
        error: message,
        durationMs: Date.now() - start,
      };
    } finally {
      try {
        await client.close();
      } catch {
        // best-effort close — never let cleanup errors propagate
      }
    }
  }

  private resolveToolName(
    mcp: McpServerRegistration,
    capability: string,
  ): string | null {
    // Priority 1: exact match in toolsAvailable (tool is named the same as the capability)
    if (mcp.toolsAvailable.includes(capability)) return capability;

    // Priority 2: first tool whose name contains the capability as a substring
    const partial = mcp.toolsAvailable.find((t) =>
      t.toLowerCase().includes(capability.toLowerCase()),
    );
    if (partial) return partial;

    // Priority 3: first available tool (catch-all — let the MCP decide)
    return mcp.toolsAvailable[0] ?? null;
  }

  private timeout(ms: number, label: string): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${label}`)), ms),
    );
  }
}
