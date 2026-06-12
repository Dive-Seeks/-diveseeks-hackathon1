import { Injectable, Logger } from '@nestjs/common';
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const {
  StdioClientTransport,
} = require('@modelcontextprotocol/sdk/client/stdio.js');

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

@Injectable()
export class McpManagerService {
  private readonly logger = new Logger(McpManagerService.name);
  private clients: Map<string, any> = new Map();

  async connect(config: McpServerConfig): Promise<any> {
    this.logger.log(
      `Connecting to MCP server: ${config.name} (${config.command})...`,
    );

    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([_, v]) => v !== undefined),
          ),
          ...config.env,
        },
      });

      const client = new Client({
        name: `diveseeks-mcp-${config.name}`,
        version: '1.0.0',
      });

      await client.connect(transport);
      this.clients.set(config.name, client);
      this.logger.log(`MCP server ${config.name} connected successfully`);
      return client;
    } catch (err) {
      this.logger.error(
        `Failed to connect to MCP ${config.name}: ${err.message}`,
      );
      throw err;
    }
  }

  async listTools(serverName: string): Promise<any[]> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server ${serverName} not found or not connected`);
    }

    try {
      const result = await client.listTools();
      return result.tools || [];
    } catch (err) {
      this.logger.error(
        `Failed to list tools for ${serverName}: ${err.message}`,
      );
      throw err;
    }
  }

  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      await client.close();
      this.clients.delete(serverName);
      this.logger.log(`MCP server ${serverName} disconnected`);
    }
  }

  getClient(serverName: string): any {
    return this.clients.get(serverName);
  }
}
