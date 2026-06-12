import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, Optional } from '@nestjs/common';
import { HermesGateway } from '../hermes/hermes.gateway';
import { API_FUSION_QUEUE, ApiFusionJobs } from './api-fusion.queue';
import { SpecDiscoveryService } from './services/spec-discovery.service';
import { ApiSpecAnalyzerService } from './services/api-spec-analyzer.service';
import { AdapterGeneratorService } from './services/adapter-generator.service';
import { ApiTestRunnerService } from './services/api-test-runner.service';
import { McpProviderRegistryService } from './services/mcp-provider-registry.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiFusionBlueprint } from './entities/api-fusion-blueprint.entity';

@Processor(API_FUSION_QUEUE)
export class ApiFusionProcessor extends WorkerHost {
  private readonly logger = new Logger(ApiFusionProcessor.name);

  constructor(
    @InjectRepository(ApiFusionBlueprint)
    private readonly blueprintRepo: Repository<ApiFusionBlueprint>,
    @InjectQueue(API_FUSION_QUEUE)
    private readonly apiFusionQueue: Queue,
    private readonly mcpRegistry: McpProviderRegistryService,
    private readonly discovery: SpecDiscoveryService,
    private readonly analyzer: ApiSpecAnalyzerService,
    private readonly generator: AdapterGeneratorService,
    private readonly testRunner: ApiTestRunnerService,
    @Optional() private readonly gateway?: HermesGateway,
  ) {
    super();
  }

  private emitToTenant(tenantId: string, event: string, payload: object): void {
    if (this.gateway?.server) {
      this.gateway.server.to(`tenant:${tenantId}`).emit(event, payload);
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { blueprintId, tenantId, provider, specUrl } = job.data;
    if (!blueprintId) {
      this.logger.error(`[Job:${job.id}] Missing blueprintId in job data`);
      throw new Error('Missing blueprintId in job payload');
    }
    this.logger.log(
      `[Job:${job.id}] Starting ${job.name} for provider: ${provider} (Blueprint: ${blueprintId})`,
    );

    const payload = { blueprintId, tenantId, provider, specUrl };

    try {
      let result;
      switch (job.name) {
        case ApiFusionJobs.MCP_CHECK:
          result = await this.handleMcpCheck(blueprintId, provider, tenantId);
          if (result?.hasMcp) {
            await this.apiFusionQueue.add(ApiFusionJobs.MCP_WIRE, payload);
            this.logger.log(
              `[Job:${job.id}] Enqueued ${ApiFusionJobs.MCP_WIRE} for provider: ${provider}`,
            );
          } else {
            await this.apiFusionQueue.add(ApiFusionJobs.DISCOVER, payload);
            this.logger.log(
              `[Job:${job.id}] Enqueued ${ApiFusionJobs.DISCOVER} for provider: ${provider}`,
            );
          }
          break;

        case ApiFusionJobs.MCP_WIRE:
          result = await this.handleMcpWire(blueprintId, provider);
          // Terminal for MCP path — user approves via controller
          break;

        case ApiFusionJobs.DISCOVER:
          result = await this.handleDiscover(
            blueprintId,
            provider,
            specUrl,
            tenantId,
          );
          await this.apiFusionQueue.add(ApiFusionJobs.ANALYZE, payload);
          this.logger.log(
            `[Job:${job.id}] Enqueued ${ApiFusionJobs.ANALYZE} for provider: ${provider}`,
          );
          break;

        case ApiFusionJobs.ANALYZE:
          result = await this.handleAnalyze(blueprintId, provider, tenantId);
          await this.apiFusionQueue.add(ApiFusionJobs.GENERATE, payload);
          this.logger.log(
            `[Job:${job.id}] Enqueued ${ApiFusionJobs.GENERATE} for provider: ${provider}`,
          );
          break;

        case ApiFusionJobs.GENERATE:
          result = await this.handleGenerate(blueprintId, provider, tenantId);
          await this.apiFusionQueue.add(ApiFusionJobs.TEST, payload);
          this.logger.log(
            `[Job:${job.id}] Enqueued ${ApiFusionJobs.TEST} for provider: ${provider}`,
          );
          break;

        case ApiFusionJobs.TEST:
          result = await this.handleTest(blueprintId, tenantId);
          // Terminal — sets status to pending_approval or failed; user approves via controller
          break;

        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
      this.logger.log(
        `[Job:${job.id}] Completed ${job.name} for provider: ${provider}`,
      );
      return result;
    } catch (e) {
      this.logger.error(
        `[Job:${job.id}] Failed ${job.name} for ${provider}: ${e.message}`,
        e.stack,
      );
      try {
        await this.blueprintRepo.update(blueprintId, {
          status: 'failed',
          failureReason: e.message,
        });
      } catch (updateErr) {
        this.logger.error(
          `[Job:${job.id}] Could not persist failure status: ${updateErr.message}`,
        );
      }
      this.emitToTenant(tenantId ?? '', 'api_fusion_failed', {
        blueprintId: blueprintId ?? '',
        provider: provider ?? '',
        reason: e.message,
      });
      throw e;
    }
  }

  private async handleMcpCheck(
    blueprintId: string,
    provider: string,
    tenantId: string,
  ) {
    this.logger.log(`Checking native MCP support for ${provider}...`);
    const hasMcp = this.mcpRegistry.hasMcpServer(provider);
    if (hasMcp) {
      const config = this.mcpRegistry.getMcpConfig(provider);
      await this.blueprintRepo.update(blueprintId, {
        adapterType: 'mcp_native',
        mcpServerUrl: config?.mcpServerUrl,
        status: 'awaiting_credentials',
      });
      this.emitToTenant(tenantId, 'api_fusion_mcp_wired', {
        blueprintId,
        provider,
        mcpServerUrl: config?.mcpServerUrl,
        toolCount: 0, // will be populated after credentials + approval
      });
      return { hasMcp: true };
    }

    // If no MCP, move to discovery
    await this.blueprintRepo.update(blueprintId, { status: 'discovering' });
    this.emitToTenant(tenantId, 'api_fusion_stage_changed', {
      blueprintId,
      provider,
      stage: 'discovering',
      progress: 10,
      adapterType: 'runtime',
    });
    return { hasMcp: false };
  }

  private async handleDiscover(
    blueprintId: string,
    provider: string,
    specUrl: string | undefined,
    tenantId: string,
  ) {
    this.logger.log(
      `Starting discovery for ${provider} (URL: ${specUrl || 'auto'})...`,
    );
    const { specRaw, source } = await this.discovery.discover(
      provider,
      specUrl,
    );
    await this.blueprintRepo.update(blueprintId, {
      specRaw: typeof specRaw === 'string' ? JSON.parse(specRaw) : specRaw,
      specSource: source,
      status: 'analyzing',
    });
    this.emitToTenant(tenantId, 'api_fusion_stage_changed', {
      blueprintId,
      provider,
      stage: 'analyzing',
      progress: 30,
      adapterType: 'runtime',
    });
  }

  private async handleAnalyze(
    blueprintId: string,
    provider: string,
    tenantId: string,
  ) {
    this.logger.log(`Starting spec analysis for ${provider}...`);
    const blueprint = await this.blueprintRepo.findOne({
      where: { id: blueprintId },
    });
    if (!blueprint) throw new Error('Blueprint not found');

    const result = await this.analyzer.analyze(
      JSON.stringify(blueprint.specRaw),
      provider,
    );
    await this.blueprintRepo.update(blueprintId, {
      endpoints: result.endpoints,
      authScheme: result.authScheme,
      authConfig: result.authConfig,
      status: 'generating',
    });
    this.emitToTenant(tenantId, 'api_fusion_stage_changed', {
      blueprintId,
      provider,
      stage: 'generating',
      progress: 55,
      adapterType: 'runtime',
    });
  }

  private async handleGenerate(
    blueprintId: string,
    provider: string,
    tenantId: string,
  ) {
    this.logger.log(`Starting adapter generation for ${provider}...`);
    const blueprint = await this.blueprintRepo.findOne({
      where: { id: blueprintId },
    });
    if (!blueprint) throw new Error('Blueprint not found');

    const result = await this.generator.generate(
      blueprint.endpoints,
      blueprint.authScheme || '',
      provider,
    );

    await this.blueprintRepo.update(blueprintId, {
      endpoints: result.endpoints,
      mcpToolSchemas: result.mcpToolSchemas,
      status: 'testing',
    });
    this.emitToTenant(tenantId, 'api_fusion_stage_changed', {
      blueprintId,
      provider,
      stage: 'testing',
      progress: 75,
      adapterType: 'runtime',
    });
  }

  private async handleTest(blueprintId: string, tenantId: string) {
    this.logger.log(
      `Starting integration tests for ${blueprintId} (Tenant: ${tenantId})...`,
    );
    const blueprint = await this.blueprintRepo.findOne({
      where: { id: blueprintId },
    });
    if (!blueprint) throw new Error('Blueprint not found');

    const result = await this.testRunner.runTests(blueprint, tenantId);

    if (result.total === 0) {
      await this.blueprintRepo.update(blueprintId, {
        status: 'failed',
        failureReason: 'no_endpoints_discovered',
      });
      this.emitToTenant(tenantId, 'api_fusion_failed', {
        blueprintId,
        provider: blueprint.provider,
        reason: 'no_endpoints_discovered',
      });
      return;
    }
    if (result.pass / result.total >= 0.5) {
      await this.blueprintRepo.update(blueprintId, {
        status: 'pending_approval',
      });
      this.emitToTenant(tenantId, 'api_fusion_test_complete', {
        blueprintId,
        provider: blueprint.provider,
        passed: result.pass,
        failed: result.total - result.pass,
        skipped: (result as any).skipped ?? 0,
        readyToApprove: true,
      });
      this.emitToTenant(tenantId, 'api_fusion_ready', {
        blueprintId,
        provider: blueprint.provider,
        mcpTools: [], // populated after approval
      });
    } else {
      await this.blueprintRepo.update(blueprintId, {
        status: 'failed',
        failureReason: 'test_threshold_not_met',
      });
      this.emitToTenant(tenantId, 'api_fusion_failed', {
        blueprintId,
        provider: blueprint.provider,
        reason: 'test_threshold_not_met',
      });
    }
  }

  private async handleMcpWire(blueprintId: string, provider: string) {
    // MCP_WIRE is the fast path: provider has a native MCP server.
    // Blueprint status was already set to 'pending_approval' in handleMcpCheck.
    // WS event emission will be wired once the gateway is available.
    this.logger.log(
      `[MCP_WIRE] Provider ${provider} (Blueprint: ${blueprintId}) is MCP-native. ` +
        `Awaiting credential input from user — status: awaiting_credentials.`,
    );
    return { mcpWire: true };
  }
}
