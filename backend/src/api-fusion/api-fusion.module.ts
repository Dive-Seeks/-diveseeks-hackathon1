import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ApiFusionBlueprint } from './entities/api-fusion-blueprint.entity';
import { ApiFusionCredential } from './entities/api-fusion-credential.entity';
import { ApiFusionTestResult } from './entities/api-fusion-test-result.entity';
import { ApiFusionExecution } from './entities/api-fusion-execution.entity';
import { API_FUSION_QUEUE } from './api-fusion.queue';
import { ApiFusionController } from './api-fusion.controller';
import { ApiFusionProcessor } from './api-fusion.processor';
import { CredentialVaultService } from './services/credential-vault.service';
import { McpProviderRegistryService } from './services/mcp-provider-registry.service';
import { ApiFusionMcpBridgeService } from './services/api-fusion-mcp-bridge.service';
import { SpecDiscoveryService } from './services/spec-discovery.service';
import { ApiSpecAnalyzerService } from './services/api-spec-analyzer.service';
import { AdapterGeneratorService } from './services/adapter-generator.service';
import { ApiTestRunnerService } from './services/api-test-runner.service';
import { ApiFusionExecutorService } from './services/api-fusion-executor.service';
import { NativeAdapterPromoterService } from './services/native-adapter-promoter.service';
import { WebResearchModule } from '../web-research/web-research.module';
import { MenuEmbeddingsModule } from '../menu-embeddings/menu-embeddings.module';
import { HermesModule } from '../hermes/hermes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiFusionBlueprint,
      ApiFusionCredential,
      ApiFusionTestResult,
      ApiFusionExecution,
    ]),
    BullModule.registerQueue({
      name: API_FUSION_QUEUE,
    }),
    WebResearchModule,
    MenuEmbeddingsModule,
    HermesModule,
  ],
  controllers: [ApiFusionController],
  providers: [
    ApiFusionProcessor,
    CredentialVaultService,
    McpProviderRegistryService,
    ApiFusionMcpBridgeService,
    SpecDiscoveryService,
    ApiSpecAnalyzerService,
    AdapterGeneratorService,
    ApiTestRunnerService,
    ApiFusionExecutorService,
    NativeAdapterPromoterService,
  ],
  exports: [ApiFusionMcpBridgeService, ApiFusionExecutorService],
})
export class ApiFusionModule {}
