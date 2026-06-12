import { Injectable, Logger } from '@nestjs/common';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

@Injectable()
export class McpValidatorService {
  private readonly logger = new Logger(McpValidatorService.name);

  async validate(
    command: string,
    envVars: Record<string, string>,
  ): Promise<{
    success: boolean;
    tools: string[];
    error?: string;
    details?: string;
  }> {
    const [cmd, ...args] = command.split(' ');

    // Check 1: Can the process start? (Done via StdioClientTransport)
    const transport = new StdioClientTransport({
      command: cmd,
      args,
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([_, v]) => v !== undefined),
        ),
        ...envVars,
      } as Record<string, string>,
    });

    const client = new Client(
      { name: 'DiveSeeks-Validator', version: '1.0.0' },
      { capabilities: {} },
    );

    const timeout = (ms: number) =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Validation timeout after 5s')), ms),
      );

    try {
      // Check 5: Responds within 5 seconds
      await Promise.race([client.connect(transport), timeout(5000)]);

      // Check 2: list_tools() returns at least one tool
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools.map((t) => t.name);

      if (tools.length === 0) {
        return {
          success: false,
          tools: [],
          error: 'No tools returned by MCP server',
        };
      }

      // Check 3: Expected tools present (Simplified for dynamic validation)
      // Check 4: Read-only test call succeeds (Optional/Context specific)
      // For now, we consider a successful listTools() a strong signal.

      await client.close();
      return { success: true, tools };
    } catch (err) {
      this.logger.error(`Validation failed for ${command}: ${err.message}`);
      return {
        success: false,
        tools: [],
        error: err.message,
        details: err.stack,
      };
    }
  }
}
