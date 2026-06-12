import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WebResearchService } from './web-research.service';
import { BrowserAgentService } from './browser-agent.service';
import { ContentCleanerService } from './content-cleaner.service';
import { ResearchJob } from './entities/research-job.entity';
import { WebChunk } from '../tokenizer/entities/web-chunk.entity';
import { TokenizerModule } from '../tokenizer/tokenizer.module';
import { KnowledgeStoreModule } from '../knowledge-store';
import { MenuEmbeddingsModule } from '../menu-embeddings/menu-embeddings.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { WebResearchProcessor } from './web-research.processor';
import { CommonModule } from '../common/common.module';
import { SearchApiProvider } from './providers/search-api.provider';
import { CrawleeProvider } from './providers/crawlee.provider';
import { PlaywrightMcpProvider } from './providers/playwright-mcp.provider';
import { FirecrawlProvider } from './providers/firecrawl.provider';
import { HttpFetchProvider } from './providers/http-fetch.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResearchJob, WebChunk]),
    BullModule.registerQueue({ name: 'web-research-global' }),
    TokenizerModule,
    forwardRef(() => KnowledgeStoreModule),
    MenuEmbeddingsModule,
    CommonModule,
    GatewaysModule,
  ],
  providers: [
    WebResearchService,
    BrowserAgentService,
    ContentCleanerService,
    WebResearchProcessor,
    SearchApiProvider,
    CrawleeProvider,
    PlaywrightMcpProvider,
    FirecrawlProvider,
    HttpFetchProvider,
  ],
  exports: [WebResearchService, BrowserAgentService, TypeOrmModule],
})
export class WebResearchModule {}
