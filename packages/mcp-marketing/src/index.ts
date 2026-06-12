import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get, post } from './client.js';

const server = new McpServer({ name: 'dive-mcp-marketing', version: '1.0.0' });

server.tool('diveGetCampaigns', {
  tenantId: z.string().uuid(),
}, async (args) => {
  const data = await get('/marketing/campaigns', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveCreateCampaign', {
  tenantId: z.string().uuid(),
  name: z.string(),
  budget: z.number(),
  targetAudience: z.string(),
}, async (args) => {
  const data = await post('/marketing/campaigns', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveSendEmail', {
  tenantId: z.string().uuid(),
  subject: z.string(),
  body: z.string(),
  segments: z.array(z.string()),
}, async (args) => {
  const data = await post('/marketing/emails/send', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveSchedulePost', {
  tenantId: z.string().uuid(),
  platform: z.enum(['facebook', 'instagram', 'twitter']),
  content: z.string(),
  scheduledTime: z.string(),
}, async (args) => {
  const data = await post('/marketing/social/schedule', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
