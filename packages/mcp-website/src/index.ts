import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get, post } from './client.js';

const server = new McpServer({ name: 'dive-mcp-website', version: '1.0.0' });

server.tool('diveGetWebsiteConfig', {
  tenantId: z.string().uuid(),
}, async (args) => {
  const data = await get('/website/config', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveUpdateWebsiteConfig', {
  tenantId: z.string().uuid(),
  config: z.record(z.string(), z.any()),
}, async (args) => {
  const data = await post('/website/config', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('divePublishPage', {
  tenantId: z.string().uuid(),
  pageSlug: z.string(),
  content: z.string(),
}, async (args) => {
  const data = await post('/website/pages/publish', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveUpdateSeoMeta', {
  tenantId: z.string().uuid(),
  pageSlug: z.string(),
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
}, async (args) => {
  const data = await post('/website/pages/seo', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
