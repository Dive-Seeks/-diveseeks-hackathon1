import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get, post } from './client.js';

const server = new McpServer({ name: 'dive-mcp-memory', version: '1.0.0' });

server.tool('diveGetMemoryIndex', {
  ownerType: z.enum(['agent', 'subagent', 'tenant']).describe('Type of memory owner'),
  ownerId: z.string().describe('Unique identifier for the owner'),
  keywords: z.array(z.string()).describe('Keywords to filter memory index by'),
}, async (args) => {
  const data = await get('/memory/scan', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveFetchEpisodes', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  domain: z.string().describe('Domain area (e.g. seo, menu, marketing)'),
  query: z.string().describe('Natural language query for semantic search'),
  limit: z.number().int().optional().describe('Maximum number of episodes to return'),
}, async (args) => {
  const data = await post('/memory/episodes', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveWriteEpisode', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  domain: z.string().describe('Domain area for this episode'),
  issueId: z.string().uuid().optional().describe('Optional linked issue ID'),
  title: z.string().describe('Short descriptive title for the episode'),
  summary: z.string().describe('Detailed summary of what happened and what was learned'),
  keywords: z.array(z.string()).describe('List of keywords for indexing'),
}, async (args) => {
  const data = await post('/memory/episodes/write', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveDeleteEpisode', {
  episodeId: z.string().uuid().describe('Unique identifier of the episode to delete'),
}, async (args) => {
  const data = await post(`/memory/episodes/${args.episodeId}/delete`, {});
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
