export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ApiEndpointDef {
  method: string;
  path: string;
  summary: string;
  authRequired: boolean;
  requestSchema?: object;
  responseSchema?: object;
  testPlan?: ApiTestPlan;
}

export interface ApiTestPlan {
  exampleRequest: object;
  exampleResponse: object;
  testStrategy: string;
  edgeCases: string[];
}

export interface KnownMcpProvider {
  mcpServerUrl: string;
  transport: 'stdio' | 'http' | 'sse';
  authScheme: 'oauth2' | 'api_key' | 'bearer' | 'basic';
  scopeHints?: string[];
}

export interface KnownProvider {
  specUrl?: string;
  mcpServerUrl?: string;
  mcpTransport?: 'stdio' | 'http' | 'sse';
  authScheme: 'oauth2' | 'api_key' | 'bearer' | 'basic';
  scopes?: string[];
  sandboxCredentials?: object;
}
