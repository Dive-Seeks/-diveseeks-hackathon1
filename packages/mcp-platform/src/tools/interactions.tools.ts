import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { post } from '../client';

export function registerInteractionsTools(server: McpServer) {
  server.tool('diveSuggestTasks', {
    issueId: z.string().uuid(),
    agentId: z.string().uuid().describe('Manager or specialist making the suggestion'),
    tasks: z.array(z.string().max(200)).min(1).max(10).describe('Suggested task descriptions'),
  }, async ({ issueId, ...body }) => {
    const data = await post(`/agent-issues/${issueId}/interactions`, {
      type: 'suggest_tasks',
      ...body,
    });
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveAskUserQuestion', {
    issueId: z.string().uuid(),
    agentId: z.string().uuid(),
    question: z.string().max(500).describe('Question to ask the tenant'),
    context: z.string().max(200).optional().describe('Why this question is needed'),
  }, async ({ issueId, ...body }) => {
    const data = await post(`/agent-issues/${issueId}/interactions`, {
      type: 'ask_user_questions',
      ...body,
    });
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveRequestConfirmation', {
    issueId: z.string().uuid(),
    agentId: z.string().uuid(),
    summary: z.string().max(500).describe('What will happen if tenant confirms'),
    approvalId: z.string().uuid().describe('Linked approval record'),
  }, async ({ issueId, ...body }) => {
    const data = await post(`/agent-issues/${issueId}/interactions`, {
      type: 'request_confirmation',
      ...body,
    });
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveAddComment', {
    issueId: z.string().uuid(),
    agentId: z.string().uuid(),
    content: z.string().max(2000),
    isInternal: z.boolean().default(false).describe('Internal note (not visible to tenant) or tenant-visible'),
  }, async ({ issueId, ...body }) => {
    const data = await post(`/agent-issues/${issueId}/comments`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });
}
