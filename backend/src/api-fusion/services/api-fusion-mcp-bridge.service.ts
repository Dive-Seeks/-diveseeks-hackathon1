import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiFusionBlueprint } from '../entities/api-fusion-blueprint.entity';
import { ApiFusionExecutorService } from './api-fusion-executor.service';
import { McpToolDefinition } from '../interfaces/api-fusion.interfaces';

@Injectable()
export class ApiFusionMcpBridgeService implements OnModuleInit {
  private readonly logger = new Logger(ApiFusionMcpBridgeService.name);
  private toolRegistry: Map<string, McpToolDefinition[]> = new Map(); // tenantId -> tools[]

  constructor(
    @InjectRepository(ApiFusionBlueprint)
    private readonly blueprintRepo: Repository<ApiFusionBlueprint>,
    private readonly executor: ApiFusionExecutorService,
  ) {}

  async onModuleInit() {
    await this.rehydrateAllTools();
  }

  async rehydrateAllTools(): Promise<void> {
    this.logger.log('Rehydrating all active API Fusion MCP tools...');
    const activeBlueprints = await this.blueprintRepo.find({
      where: { status: 'active' },
    });

    for (const blueprint of activeBlueprints) {
      if (blueprint.tenantId) {
        await this.registerBlueprintTools(blueprint, blueprint.tenantId);
      } else if (blueprint.isGlobal) {
        // Global blueprints are available to all, but for now we'll handle them as needed
        // Or register them for a "system" tenant
      }
    }
  }

  async registerBlueprintTools(
    blueprint: ApiFusionBlueprint,
    tenantId: string,
  ): Promise<void> {
    const tools = blueprint.mcpToolSchemas || [];
    if (tools.length === 0) return;

    const existing = this.toolRegistry.get(tenantId) || [];
    // Filter out old tools for this provider if they exist
    const filtered = existing.filter(
      (t) => !t.name.startsWith(`${blueprint.provider}__`),
    );

    this.toolRegistry.set(tenantId, [...filtered, ...tools]);
    this.logger.log(
      `Registered ${tools.length} MCP tools for ${blueprint.provider} (Tenant: ${tenantId})`,
    );
  }

  async unregisterBlueprintTools(
    blueprintId: string,
    tenantId: string,
  ): Promise<void> {
    const blueprint = await this.blueprintRepo.findOne({
      where: { id: blueprintId },
    });
    if (!blueprint) return;

    const existing = this.toolRegistry.get(tenantId) || [];
    const filtered = existing.filter(
      (t) => !t.name.startsWith(`${blueprint.provider}__`),
    );
    this.toolRegistry.set(tenantId, filtered);
  }

  async dispatchToolCall(
    toolName: string,
    tenantId: string,
    input: object,
  ): Promise<object> {
    // toolName format: facebook__get_me
    const [provider, ...rest] = toolName.split('__');
    const endpointSummary = rest.join('__');

    const blueprint = await this.blueprintRepo.findOne({
      where: { provider, tenantId, status: 'active' },
    });

    if (!blueprint) {
      throw new Error(`No active blueprint found for provider: ${provider}`);
    }

    // Find the original endpoint summary to match back to path
    const endpoint = blueprint.endpoints.find(
      (e) => this.slugify(e.summary) === endpointSummary,
    );

    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointSummary}`);
    }

    const result = await this.executor.call(
      tenantId,
      provider,
      `${endpoint.method} ${endpoint.path}`,
      input,
      'specialist',
      toolName,
    );

    return result.body;
  }

  generateToolSchemas(blueprint: ApiFusionBlueprint): McpToolDefinition[] {
    return blueprint.endpoints.map((e) => ({
      name: `${blueprint.provider}__${this.slugify(e.summary || `${e.method}_${e.path}`)}`,
      description: e.summary,
      inputSchema: {
        type: 'object',
        properties: (e.requestSchema as any)?.properties || {},
        required: (e.requestSchema as any)?.required || [],
      },
    }));
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');
  }

  getToolsForTenant(tenantId: string): McpToolDefinition[] {
    return this.toolRegistry.get(tenantId) || [];
  }
}
