import { SpecialistId } from '../entities/mcp-server-registration.entity';

export interface KnownMcpServer {
  name: string;
  package: string;
  defaultAssignment: SpecialistId[] | 'chatbox' | 'all';
  category:
    | 'Universal'
    | 'Databases'
    | 'Frontend'
    | 'DevOps'
    | 'Observability'
    | 'Coordination';
  condition?: string;
  description: string;
}

export const KNOWN_MCP_SERVERS: KnownMcpServer[] = [
  // Universal
  {
    name: 'GitHub MCP',
    package: '@modelcontextprotocol/server-github',
    defaultAssignment: 'all',
    category: 'Universal',
    description: 'Read files, commits, PRs, and issues from GitHub.',
  },
  {
    name: 'Context7',
    package: '@upstash/context7-mcp',
    defaultAssignment: 'all',
    category: 'Universal',
    description: 'On-demand documentation for any library.',
  },
  {
    name: 'Filesystem MCP',
    package: '@modelcontextprotocol/server-filesystem',
    defaultAssignment: 'all',
    category: 'Universal',
    description: 'Read/write files in the project directory.',
  },
  {
    name: 'DiveSeeks Memory MCP (internal)',
    package: 'internal',
    defaultAssignment: 'all',
    category: 'Universal',
    description: 'Per-project error patterns and decisions.',
  },

  // Observability
  {
    name: 'Digma MCP',
    package: 'digma-ai/digma-mcp-server',
    defaultAssignment: ['rex', 'pixel'],
    category: 'Observability',
    description: 'Runtime performance tracing and bottleneck analysis.',
  },

  // Coordination (Chatbox Only)
  {
    name: 'Notion MCP',
    package: '@makenotion/notion-mcp-server',
    defaultAssignment: 'chatbox',
    category: 'Coordination',
    description: 'Project notes and tasks from Notion.',
  },
  {
    name: 'GSuite MCP',
    package: '@googlelabs/gsuit-mcp',
    defaultAssignment: 'chatbox',
    category: 'Coordination',
    description: 'Docs, Sheets, and Calendar integration.',
  },
  {
    name: 'Zapier MCP',
    package: '@zapier/mcp',
    defaultAssignment: 'chatbox',
    category: 'Coordination',
    description: 'Workflow automation triggers.',
  },

  // Databases
  {
    name: 'PostgreSQL MCP',
    package: '@modelcontextprotocol/server-postgres',
    defaultAssignment: ['rex'],
    category: 'Databases',
    condition: 'PostgreSQL detected',
    description: 'SQL query access to PostgreSQL.',
  },
  {
    name: 'Supabase MCP',
    package: '@supabase/mcp-server-supabase',
    defaultAssignment: ['rex', 'atlas'],
    category: 'Databases',
    condition: 'Supabase detected',
    description: 'Database and infrastructure access for Supabase.',
  },

  // Databases (continued)
  {
    name: 'Firebase MCP',
    package: '@gannonh/firebase-mcp',
    defaultAssignment: ['rex'],
    category: 'Databases',
    condition: 'Firebase project detected',
    description: 'Firebase Firestore and Auth access for Rex.',
  },

  // Frontend / QA / Testing
  {
    name: 'Playwright MCP',
    package: '@playwright/mcp',
    defaultAssignment: ['nova', 'sage', 'vex'],
    category: 'Frontend',
    description:
      'Browser automation for visual testing, E2E tests, and live security testing.',
  },
  {
    name: 'Figma MCP',
    package: '@figma/mcp',
    defaultAssignment: ['nova'],
    category: 'Frontend',
    condition: 'Figma workspace connected',
    description: 'Read design tokens, component specs, and layouts from Figma.',
  },

  // DevOps / Infrastructure
  {
    name: 'Kubernetes MCP',
    package: '@flux-mcp/kubernetes',
    defaultAssignment: ['atlas'],
    category: 'DevOps',
    condition: 'Kubernetes cluster detected',
    description: 'Cluster management and deployment for Atlas.',
  },
  {
    name: 'DigitalOcean MCP',
    package: '@digitalocean/mcp',
    defaultAssignment: ['atlas'],
    category: 'DevOps',
    condition: 'DigitalOcean project connected',
    description: 'Droplet and App Platform management for Atlas.',
  },
  {
    name: 'Heroku MCP',
    package: '@heroku/mcp-server-heroku',
    defaultAssignment: ['atlas'],
    category: 'DevOps',
    condition: 'Heroku app connected',
    description: 'Heroku dyno and pipeline management for Atlas.',
  },

  // Data Engine (Internal Knowledge Pipeline)
  {
    name: 'Data Engine — Query',
    package: 'internal',
    defaultAssignment: 'all',
    category: 'Universal',
    description:
      'Search the project knowledge wiki. Returns cited facts with source quotes and confidence scores.',
  },
  {
    name: 'Data Engine — List Pages',
    package: 'internal',
    defaultAssignment: 'all',
    category: 'Universal',
    description:
      'List all wiki pages in the project knowledge repo, optionally filtered by domain.',
  },
  {
    name: 'Data Engine — Get Page',
    package: 'internal',
    defaultAssignment: 'all',
    category: 'Universal',
    description:
      'Retrieve the full content of a specific wiki page from the project knowledge repo.',
  },
  {
    name: 'Data Engine — Repo Health',
    package: 'internal',
    defaultAssignment: 'all',
    category: 'Universal',
    description:
      'Get status of the project knowledge repo: page count, contradictions, last ingest, domain coverage.',
  },
];
