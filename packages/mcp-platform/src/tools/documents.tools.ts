import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { post } from '../client';

export function registerDocumentsTools(server: McpServer) {
  server.tool('diveUpsertDocument', {
    issueId: z.string().uuid(),
    key: z.string().describe('Document key, e.g. "menu_output", "seo_report", "marketing_copy"'),
    content: z.record(z.string(), z.any()).describe('The structured document content'),
    version: z.number().int().default(1),
  }, async ({ issueId, key, ...body }) => {
    const data = await post(`/agent-issues/${issueId}/documents/${key}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  });

  server.tool('divePlatformApiRequest', {
    method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
    path: z.string().describe('API path, e.g. /agents or /agent-issues/123'),
    body: z.record(z.string(), z.any()).optional(),
    query: z.record(z.string(), z.string()).optional(),
  }, async ({ method, path, body, query }) => {
    const { apiClient } = await import('../client.js');
    const res = await apiClient.request({ method, url: path, data: body, params: query });
    return { content: [{ type: 'text', text: JSON.stringify(res.data) }] };
  });
}
