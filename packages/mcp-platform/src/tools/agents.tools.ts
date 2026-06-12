import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post, patch } from '../client';

export function registerAgentsTools(server: McpServer) {
  server.tool('diveMe', {}, async () => {
    const data = await get('/agents/me');
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveListAgents', {
    tenantId: z.string().uuid().optional().describe('Filter by tenant. Omit for platform-wide agents.'),
  }, async ({ tenantId }) => {
    const data = await get('/agents', { tenantId });
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveGetAgent', {
    agentId: z.string().uuid().describe('Agent ID'),
  }, async ({ agentId }) => {
    const data = await get(`/agents/${agentId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveGetOrgChart', {}, async () => {
    const data = await get('/agents/org-chart');
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveHireAgent', {
    name: z.string().describe('Agent name (e.g. Zara, Marco)'),
    role: z.enum(['specialist', 'manager', 'night-team']).describe('Agent role'),
    domain: z.string().describe('Domain: menu, marketing, analytics, inventory, seo, etc.'),
    reportsToId: z.string().uuid().describe('Parent agent ID in org chart'),
    tenantId: z.string().uuid().optional().describe('Tenant scope. Omit for platform-wide.'),
    budgetMonthlyCents: z.number().int().default(50000).describe('Monthly budget in cents'),
    hiredByAgentId: z.string().uuid().describe('Hiring agent ID (Abigail or Jos)'),
  }, async (args) => {
    const data = await post('/agents/hire', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveTerminateAgent', {
    agentId: z.string().uuid().describe('Agent to terminate'),
  }, async ({ agentId }) => {
    const data = await post(`/agents/${agentId}/terminate`);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });
}
