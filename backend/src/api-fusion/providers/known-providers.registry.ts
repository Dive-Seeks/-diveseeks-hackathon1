import { KnownProvider } from '../interfaces/api-fusion.interfaces';

export const KNOWN_PROVIDERS: Record<string, KnownProvider> = {
  // ── Native MCP first ──────────────────────────────────────────
  stripe: {
    mcpServerUrl: 'https://mcp.stripe.com',
    mcpTransport: 'http',
    authScheme: 'api_key',
  },
  github: {
    mcpServerUrl: 'https://api.githubcopilot.com/mcp/',
    mcpTransport: 'http',
    authScheme: 'oauth2',
    scopes: ['repo', 'read:user'],
  },
  notion: {
    mcpServerUrl: 'https://mcp.notion.so',
    mcpTransport: 'http',
    authScheme: 'oauth2',
  },
  linear: {
    mcpServerUrl: 'https://mcp.linear.app',
    mcpTransport: 'http',
    authScheme: 'oauth2',
  },
  slack: {
    mcpServerUrl: 'https://mcp.slack.com',
    mcpTransport: 'sse',
    authScheme: 'oauth2',
  },

  // ── Adapter path (OpenAPI spec available) ─────────────────────
  facebook: {
    specUrl: 'https://developers.facebook.com/docs/graph-api/...',
    authScheme: 'oauth2',
    scopes: ['public_profile', 'pages_read_engagement'],
  },
  gmail: {
    specUrl: 'https://gmail.googleapis.com/$discovery/rest',
    authScheme: 'oauth2',
    scopes: ['gmail.readonly', 'gmail.send'],
  },
  shopify: {
    specUrl: 'https://shopify.dev/docs/api/admin-rest.json',
    authScheme: 'oauth2',
    scopes: ['read_orders', 'write_products'],
  },
  whatsapp: {
    specUrl: 'https://developers.facebook.com/docs/whatsapp/...',
    authScheme: 'bearer',
  },
  hubspot: {
    specUrl: 'https://api.hubspot.com/api-catalog-public/v1/apis',
    authScheme: 'oauth2',
  },
  xero: {
    specUrl:
      'https://raw.githubusercontent.com/XeroAPI/Xero-OpenAPI/master/xero_accounting.yaml',
    authScheme: 'oauth2',
  },
  twilio: {
    specUrl:
      'https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/json/twilio_api_v2010.json',
    authScheme: 'basic',
  },
  sendgrid: {
    specUrl:
      'https://raw.githubusercontent.com/sendgrid/sendgrid-oai/main/oai.json',
    authScheme: 'api_key',
  },
};
