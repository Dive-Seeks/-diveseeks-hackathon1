import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post } from '../client';

export function registerMemoryTools(server: McpServer) {
  server.tool('diveGetMemoryIndex', {
    ownerType: z.enum(['agent', 'subagent', 'tenant']),
    ownerId: z.string().describe('Agent ID or tenant ID'),
    keywords: z.array(z.string()).min(1).max(10).describe('Keywords to scan for in TSV index'),
  }, async (args) => {
    const data = await get('/memory/scan', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveFetchEpisodes', {
    tenantId: z.string().uuid(),
    domain: z.string(),
    query: z.string().describe('Natural language query for cosine similarity search'),
    limit: z.number().int().max(10).default(5),
    rowIds: z.array(z.string()).optional().describe('Pre-filtered row IDs from TSV scan'),
  }, async (args) => {
    const data = await post('/memory/episodes', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveTenantContext', {
    tenantId: z.string().uuid(),
    domain: z.string(),
  }, async (args) => {
    const data = await get('/memory/context', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });
}
