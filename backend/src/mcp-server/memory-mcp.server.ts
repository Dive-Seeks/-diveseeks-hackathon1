import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Server as HttpServer } from 'node:http';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { TsvLoaderUtil } from '../jos/tsv-loader.util';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';
import crypto from 'node:crypto';
import { ProjectContextService } from '../abigail/project-context.service';

export interface TsvMemoryRow {
  id: string;
  type: string;
  keywords: string;
  summary: string;
}

export interface TenantContextResult {
  recentSummaries: string[];
  confirmedPreferences: TsvMemoryRow[];
}

@Injectable()
export class MemoryMcpServer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMcpServer.name);
  private httpServer: HttpServer | null = null;

  constructor(
    @InjectRepository(AgentEpisode)
    private readonly episodeRepo: Repository<AgentEpisode>,
    private readonly projectContextService: ProjectContextService,
  ) {}

  onModuleInit(): void {
    const port = parseInt(process.env.MCP_MEMORY_PORT ?? '7772', 10);
    this.startServer(port).catch((err) =>
      this.logger.error(`MCP memory server failed to start: ${err}`),
    );
  }

  onModuleDestroy(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.httpServer) return resolve();
      this.httpServer.close(() => {
        this.logger.log('MCP memory HTTP server closed');
        resolve();
      });
    });
  }

  private registerTools(server: McpServer): void {
    server.tool(
      'scan_memory_index',
      {
        tenantId: z.string().describe('Tenant ID to scan memory for'),
        keywords: z.array(z.string()).describe('Keywords to match against'),
      },
      async ({ tenantId, keywords }) => {
        try {
          const rows = await this.scanMemoryIndex(tenantId, keywords);
          return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
        } catch (err) {
          return {
            content: [
              { type: 'text', text: `Tool error: ${(err as Error).message}` },
            ],
            isError: true,
          };
        }
      },
    );

    server.tool(
      'fetch_episodes',
      {
        tenantId: z.string().describe('Tenant ID to fetch episodes for'),
        episodeIds: z
          .array(z.string())
          .describe('List of episode IDs to fetch'),
      },
      async ({ tenantId, episodeIds }) => {
        try {
          const episodes = await this.fetchEpisodes(tenantId, episodeIds);
          return {
            content: [{ type: 'text', text: JSON.stringify(episodes) }],
          };
        } catch (err) {
          return {
            content: [
              { type: 'text', text: `Tool error: ${(err as Error).message}` },
            ],
            isError: true,
          };
        }
      },
    );

    server.tool(
      'get_tenant_context',
      {
        tenantId: z.string().describe('Tenant ID to get context for'),
        domain: z.string().describe('Domain (e.g. seo, menu) to filter by'),
      },
      async ({ tenantId, domain }) => {
        try {
          const ctx = await this.getTenantContext(tenantId, domain);
          return { content: [{ type: 'text', text: JSON.stringify(ctx) }] };
        } catch (err) {
          return {
            content: [
              { type: 'text', text: `Tool error: ${(err as Error).message}` },
            ],
            isError: true,
          };
        }
      },
    );

    server.tool(
      'get_project_context',
      {
        projectId: z.string().describe('Project ID to assemble context for'),
        tenantId: z.string().describe('Tenant ID that owns the project'),
      },
      async ({ projectId, tenantId }) => {
        try {
          const ctx = await this.projectContextService.getProjectContext(
            projectId,
            tenantId,
          );
          return { content: [{ type: 'text', text: JSON.stringify(ctx) }] };
        } catch (err) {
          return {
            content: [
              { type: 'text', text: `Tool error: ${(err as Error).message}` },
            ],
            isError: true,
          };
        }
      },
    );
  }

  private async startServer(port: number): Promise<void> {
    const app = express();
    app.use(express.json());

    app.all('/mcp', async (req, res) => {
      // Stateless mode: fresh transport per request to avoid message ID collisions
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const server = new McpServer({
        name: 'diveseeks-mcp-memory',
        version: '1.0.0',
      });
      this.registerTools(server);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    this.httpServer = app.listen(port, () => {
      this.logger.log(`diveseeks-mcp-memory server listening on port ${port}`);
      this.logger.log(`MCP endpoint: http://localhost:${port}/mcp`);
    });
  }

  // --- Public tool handler methods (testable directly) ---

  async scanMemoryIndex(
    tenantId: string,
    keywords: string[],
  ): Promise<TsvMemoryRow[]> {
    const tsvPath = `memory/tenants/${tenantId}.tsv`;
    const rows = await TsvLoaderUtil.readTsv(tsvPath);
    const lower = keywords.map((k) => k.toLowerCase());
    return rows
      .filter((r) => {
        const rowKws = (r.keywords ?? '').toLowerCase();
        return lower.some((kw) => rowKws.includes(kw));
      })
      .map((r) => ({
        id: r.id,
        type: r.type,
        keywords: r.keywords,
        summary: r.summary,
      }));
  }

  async fetchEpisodes(
    tenantId: string,
    episodeIds: string[],
  ): Promise<AgentEpisode[]> {
    return this.episodeRepo.find({
      where: { tenantId, id: In(episodeIds) },
      select: [
        'id',
        'domain',
        'episodeType',
        'keywords',
        'summary',
        'strategy',
        'useCount',
        'createdAt',
      ],
    });
  }

  async getTenantContext(
    tenantId: string,
    domain: string,
  ): Promise<TenantContextResult> {
    const tsvPath = `memory/tenants/${tenantId}.tsv`;
    const rows = await TsvLoaderUtil.readTsv(tsvPath);

    const domainRows = rows.filter(
      (r) => (r.domain ?? '') === domain || (r.keywords ?? '').includes(domain),
    );

    const confirmedPreferences = rows
      .filter((r) => r.type === 'confirmed_preference')
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        type: r.type,
        keywords: r.keywords,
        summary: r.summary,
      }));

    const recentSummaries = domainRows
      .filter((r) => r.type !== 'confirmed_preference')
      .slice(-3)
      .map((r) => r.summary);

    return { recentSummaries, confirmedPreferences };
  }
}
