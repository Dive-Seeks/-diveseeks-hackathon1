import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get, post } from './client.js';

const server = new McpServer({ name: 'dive-mcp-analytics', version: '1.0.0' });

server.tool('diveGetAnalytics', {
  tenantId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}, async (args) => {
  const data = await get('/analytics/reports', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveGetSalesTrends', {
  tenantId: z.string().uuid(),
  interval: z.enum(['daily', 'weekly', 'monthly']),
}, async (args) => {
  const data = await get('/analytics/trends', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveGetTopProducts', {
  tenantId: z.string().uuid(),
  limit: z.number().optional(),
}, async (args) => {
  const data = await get('/analytics/top-products', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveGetStoreComparison', {
  tenantId: z.string().uuid(),
  storeIds: z.array(z.string()),
}, async (args) => {
  // Pass as query params or request body based on API. Here we assume query string.
  const data = await get('/analytics/compare', { tenantId: args.tenantId, stores: args.storeIds.join(',') });
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
