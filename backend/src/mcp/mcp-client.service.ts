import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// experimental_createMCPClient is the @ai-sdk/mcp entry point
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { experimental_createMCPClient } = require('@ai-sdk/mcp') as {
  experimental_createMCPClient: (opts: {
    transport: { type: string; url: string };
  }) => Promise<{ tools: () => Promise<Record<string, unknown>> }>;
};

@Injectable()
export class McpClientService implements OnModuleInit {
  private readonly logger = new Logger(McpClientService.name);

  onModuleInit(): void {
    if (!process.env.MCP_POSTGRES_URL && !process.env.MCP_SEARCH_URL) {
      this.logger.warn(
        'Neither MCP_POSTGRES_URL nor MCP_SEARCH_URL is set — specialists will run without database introspection or search MCP tools. See backend/.env.example.',
      );
    }
  }

  async getPostgresTools(): Promise<Record<string, unknown>> {
    const url = process.env.MCP_POSTGRES_URL;
    if (!url) {
      this.logger.warn(
        'MCP_POSTGRES_URL not set — Postgres MCP tools unavailable',
      );
      return {};
    }
    try {
      const client = await experimental_createMCPClient({
        transport: { type: 'streamable-http', url },
      });
      return await client.tools();
    } catch (err) {
      this.logger.warn(
        `Failed to connect to Postgres MCP at ${url}: ${(err as Error).message}`,
      );
      return {};
    }
  }

  async getSearchTools(): Promise<Record<string, unknown>> {
    const url = process.env.MCP_SEARCH_URL;
    if (!url) {
      this.logger.warn('MCP_SEARCH_URL not set — Search MCP tools unavailable');
      return {};
    }
    try {
      const client = await experimental_createMCPClient({
        transport: { type: 'streamable-http', url },
      });
      return await client.tools();
    } catch (err) {
      this.logger.warn(
        `Failed to connect to Search MCP at ${url}: ${(err as Error).message}`,
      );
      return {};
    }
  }

  async getMemoryTools(): Promise<Record<string, unknown>> {
    const port = process.env.MCP_MEMORY_PORT ?? '7772';
    const url = `http://localhost:${port}/mcp`;
    try {
      const client = await experimental_createMCPClient({
        transport: { type: 'streamable-http', url },
      });
      return await client.tools();
    } catch (err) {
      this.logger.warn(
        `Failed to connect to DiveSeeks Memory MCP at ${url}: ${(err as Error).message}`,
      );
      return {};
    }
  }

  // Returns a connected DiveSeeks MCP client for direct tool calls
  // Requires DiveSeeks MCP running in HTTP mode: MCP_TRANSPORT=http npm start
  async getDiveSeeksClient(): Promise<{
    tools: () => Promise<Record<string, unknown>>;
  } | null> {
    const port = process.env.MCP_MEMORY_PORT ?? '7772';
    const url = `http://localhost:${port}/mcp`;
    try {
      const client = await experimental_createMCPClient({
        transport: { type: 'streamable-http', url },
      });
      return client;
    } catch (err) {
      this.logger.warn(
        `DiveSeeks MCP not reachable at ${url} — run: cd diveseeks-mcp && npm run start:http`,
      );
      return null;
    }
  }
}
