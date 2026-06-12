import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { get, post } from '../client';

export function registerApprovalsTools(server: McpServer) {
  server.tool('diveListApprovals', {
    tenantId: z.string().uuid().optional(),
    status: z.string().optional().describe('pending | approved | rejected | revision_requested | resubmitted'),
    page: z.number().int().default(1),
    limit: z.number().int().max(100).default(20),
  }, async (args) => {
    const data = await get('/approvals', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveGetApproval', {
    approvalId: z.string().uuid(),
  }, async ({ approvalId }) => {
    const data = await get(`/approvals/${approvalId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveCreateApproval', {
    tenantId: z.string().uuid(),
    type: z.enum(['specialist_output', 'hire_agent', 'budget_override']).describe(
      'specialist_output: specialist produced content needing tenant sign-off. ' +
      'hire_agent: Abigail wants to hire a specialist. ' +
      'budget_override: spend limit needs increasing.'
    ),
    requestedByAgentId: z.string().uuid().describe('Agent requesting approval (specialist or Abigail)'),
    reviewedByAgentId: z.string().uuid().optional().describe('Manager who reviewed before sending to tenant'),
    payload: z.record(z.string(), z.any()).describe('The content/data being approved. For specialist_output: include the structured output.'),
  }, async (args) => {
    const data = await post('/approvals', args);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveApprovalDecision', {
    approvalId: z.string().uuid(),
    action: z.enum(['approve', 'reject', 'revision_requested']).describe(
      'approve: accept as-is. ' +
      'reject: reject permanently. ' +
      'revision_requested: send back for changes — provide revisionInstructions.'
    ),
    decisionNote: z.string().max(1000).optional().describe('Reason or instructions for the decision'),
    resolvedByAgentId: z.string().uuid().describe('Agent or system making the decision'),
  }, async ({ approvalId, ...body }) => {
    const data = await post(`/approvals/${approvalId}/decide`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('diveResubmitApproval', {
    approvalId: z.string().uuid(),
  }, async ({ approvalId }) => {
    const data = await post(`/approvals/${approvalId}/resubmit`);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });
}
