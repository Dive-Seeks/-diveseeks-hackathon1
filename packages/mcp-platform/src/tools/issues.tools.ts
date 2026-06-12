import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post, patch } from '../client';

export function registerIssuesTools(server: McpServer) {
  server.tool('diveListIssues', {
    tenantId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional().describe('Filter by assignee agent'),
    status: z.string().optional().describe('todo | assigned | in_progress | in_review | waiting_approval | done | rejected | cancelled'),
    page: z.number().int().default(1),
    limit: z.number().int().max(100).default(20),
  }, async (args) => {
    const data = await get('/agent-issues', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveGetIssue', {
    issueId: z.string().uuid(),
  }, async ({ issueId }) => {
    const data = await get(`/agent-issues/${issueId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveCreateIssue', {
    tenantId: z.string().uuid(),
    title: z.string().min(3).max(200),
    description: z.string().optional(),
    assigneeAgentId: z.string().uuid().describe('Which agent will execute this'),
    domain: z.string().describe('menu | marketing | analytics | inventory | seo | images | website | copy | design | stock | loyalty'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    goalAncestry: z.object({
      domainGoal: z.string().optional(),
      tenantGoal: z.string().optional(),
    }).optional().describe('Why this work matters — injected into every prompt'),
    constraints: z.record(z.string(), z.any()).optional().describe('Constraints from prior rejections'),
    parentIssueId: z.string().uuid().optional().describe('For sub-tasks'),
    originKind: z.enum(['routine', 'manual', 'chat', 'hire']).optional(),
  }, async (args) => {
    const data = await post('/agent-issues', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveUpdateIssue', {
    issueId: z.string().uuid(),
    status: z.string().optional(),
    constraints: z.record(z.string(), z.any()).optional(),
    priority: z.string().optional(),
  }, async ({ issueId, ...body }) => {
    const data = await patch(`/agent-issues/${issueId}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveCheckoutIssue', {
    issueId: z.string().uuid(),
    agentId: z.string().uuid().describe('Agent checking out this issue'),
  }, async ({ issueId, agentId }) => {
    const data = await post(`/agent-issues/${issueId}/checkout`, { agentId });
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveReleaseIssue', {
    issueId: z.string().uuid(),
  }, async ({ issueId }) => {
    const data = await post(`/agent-issues/${issueId}/release`);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });
}
