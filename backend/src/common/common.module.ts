import { Module, Global, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GatewaysModule } from '../gateways/gateways.module';
import { AiErrorClassifierService } from './ai-error-classifier.service';
import { ToolGuardrailsService } from './tool-guardrails.service';
import { TrajectoryService } from './trajectory.service';
import { AiProviderRouter } from './ai-provider-router.service';
import { CyclePubSubService } from './cycle-pubsub.service';
import { VertexEmbeddingService } from './vertex-embedding.service';
import { TenantClsService } from './cls/tenant-cls.service';
import { TenantSlotService } from './tenant-slot/tenant-slot.service';
import { HookEngine } from './hooks/hook-engine.service';
import { ToolRegistry } from './tools/tool-registry.service';
import { CostTrackerHook } from './hooks/built-in/cost-tracker.hook';
import { MemoryBridgeHook } from './hooks/built-in/memory-bridge.hook';
import { HermesObserverHook } from './hooks/built-in/hermes-observer.hook';
import { CanvasEmitterHook } from './hooks/built-in/canvas-emitter.hook';
import { DisciplineScorerHook } from './hooks/built-in/discipline-scorer.hook';
import { GetLiveSalesTool } from './tools/built-in/get-live-sales.tool';
import { GetStockAlertsTool } from './tools/built-in/get-stock-alerts.tool';
import { SearchWikiTool } from './tools/built-in/search-wiki.tool';
import { RunInSandboxTool } from './tools/built-in/run-in-sandbox.tool';
import { FetchWebTool } from './tools/built-in/fetch-web.tool';

const BUILT_IN_HOOKS = [
  CostTrackerHook,
  MemoryBridgeHook,
  HermesObserverHook,
  CanvasEmitterHook,
  DisciplineScorerHook,
];

const BUILT_IN_TOOLS = [
  GetLiveSalesTool,
  GetStockAlertsTool,
  SearchWikiTool,
  RunInSandboxTool,
  FetchWebTool,
];

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'brain-memory' }), GatewaysModule],
  providers: [
    AiErrorClassifierService,
    ToolGuardrailsService,
    TrajectoryService,
    AiProviderRouter,
    CyclePubSubService,
    VertexEmbeddingService,
    TenantClsService,
    TenantSlotService,
    HookEngine,
    ToolRegistry,
    ...BUILT_IN_HOOKS,
    ...BUILT_IN_TOOLS,
  ],
  exports: [
    AiErrorClassifierService,
    ToolGuardrailsService,
    TrajectoryService,
    AiProviderRouter,
    CyclePubSubService,
    VertexEmbeddingService,
    TenantClsService,
    TenantSlotService,
    HookEngine,
    ToolRegistry,
  ],
})
export class CommonModule implements OnModuleInit {
  constructor(
    private readonly hookEngine: HookEngine,
    private readonly toolRegistry: ToolRegistry,
    private readonly costTracker: CostTrackerHook,
    private readonly memoryBridge: MemoryBridgeHook,
    private readonly hermesObserver: HermesObserverHook,
    private readonly canvasEmitter: CanvasEmitterHook,
    private readonly disciplineScorer: DisciplineScorerHook,
    private readonly getLiveSales: GetLiveSalesTool,
    private readonly getStockAlerts: GetStockAlertsTool,
    private readonly searchWiki: SearchWikiTool,
    private readonly runInSandbox: RunInSandboxTool,
    private readonly fetchWeb: FetchWebTool,
  ) {}

  onModuleInit(): void {
    // Register platform hooks (priority < 100)
    this.hookEngine.register(this.canvasEmitter); // priority 5
    this.hookEngine.register(this.costTracker); // priority 10
    this.hookEngine.register(this.memoryBridge); // priority 20
    this.hookEngine.register(this.hermesObserver); // priority 30
    this.hookEngine.register(this.disciplineScorer); // priority 50

    // Register platform tools
    this.toolRegistry.register(this.getLiveSales);
    this.toolRegistry.register(this.getStockAlerts);
    this.toolRegistry.register(this.searchWiki);
    this.toolRegistry.register(this.runInSandbox);
    this.toolRegistry.register(this.fetchWeb);
  }
}
