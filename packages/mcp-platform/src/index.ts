import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { registerAgentsTools } from './tools/agents.tools';
import { registerIssuesTools } from './tools/issues.tools';
import { registerApprovalsTools } from './tools/approvals.tools';
import { registerMemoryTools } from './tools/memory.tools';
import { registerInteractionsTools } from './tools/interactions.tools';
import { registerDocumentsTools } from './tools/documents.tools';

function buildServer(): McpServer {
  const server = new McpServer({
    name: 'dive-mcp-platform',
    version: '1.0.0',
    description: 'DiveSeeks AI Agent Platform — 24 tools for autonomous agent orchestration',
  });

  registerAgentsTools(server);
  registerIssuesTools(server);
  registerApprovalsTools(server);
  registerMemoryTools(server);
  registerInteractionsTools(server);
  registerDocumentsTools(server);

  return server;
}

async function startHttp(): Promise<void> {
  const port = parseInt(process.env.PORT ?? '8080', 10);
  const app = express();
  app.use(express.json());

  // Health check — required by Cloud Run
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'dive-mcp-platform', version: '1.0.0' });
  });

  // Stateless Streamable HTTP transport — one transport per request (Cloud Run compatible)
  app.all('/mcp', async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — no session affinity needed
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    console.log(`dive-mcp-platform HTTP server listening on port ${port}`);
    console.log(`DIVE_API_URL → ${process.env.DIVE_API_URL ?? 'http://localhost:7771/api'}`);
  });
}

async function startStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('dive-mcp-platform running on stdio');
}

const transport = process.env.TRANSPORT ?? 'stdio';

if (transport === 'http') {
  startHttp().catch((err) => {
    console.error('Failed to start HTTP server:', err);
    process.exit(1);
  });
} else {
  startStdio().catch((err) => {
    console.error('Failed to start stdio server:', err);
    process.exit(1);
  });
}
