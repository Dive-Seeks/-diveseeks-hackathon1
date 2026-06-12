import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const {
  StdioClientTransport,
} = require('@modelcontextprotocol/sdk/client/stdio.js');

@Injectable()
export class Context7Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Context7Service.name);
  private client: any;
  private transport: any;

  async onModuleDestroy() {
    try {
      if (this.client) await this.client.close();
    } catch {
      // ignore — process is shutting down
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing Context7 MCP Client...');
    try {
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp@latest'],
        env: {
          DEFAULT_MINIMUM_TOKENS: '10000',
        },
      });

      this.client = new Client({
        name: 'abigail-context7-client',
        version: '1.0.0',
      });

      await Promise.race([
        this.client.connect(this.transport),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Connection timed out after 10s')),
            10_000,
          ),
        ),
      ]);
      this.logger.log('Context7 MCP Client connected successfully');
    } catch (err) {
      this.logger.error(`Failed to initialize Context7 MCP: ${err.message}`);
    }
  }

  async queryDocs(libraryName: string, query: string) {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    try {
      // Step 1: Resolve Library ID
      const resolveResult = await this.client.callTool({
        name: 'resolve-library-id',
        arguments: {
          libraryName,
          query,
        },
      });

      const text = resolveResult.content?.[0]?.text || '';
      // Extract library ID from text (usually looks like /org/repo)
      const match = text.match(/\/[a-z0-9-_]+\/[a-z0-9-_.]+/i);
      const libraryId = match ? match[0] : null;

      if (!libraryId) {
        return `Could not resolve library ID for ${libraryName}. Result: ${text}`;
      }

      // Step 2: Query Docs
      const queryResult = await this.client.callTool({
        name: 'query-docs',
        arguments: {
          libraryId,
          query,
        },
      });

      return queryResult.content?.[0]?.text || 'No documentation found.';
    } catch (err) {
      this.logger.error(`Error querying Context7: ${err.message}`);
      throw err;
    }
  }
}
