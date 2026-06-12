import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiFusionBlueprint } from '../entities/api-fusion-blueprint.entity';
import { McpProviderRegistryService } from './mcp-provider-registry.service';
import { BrowserAgentService } from '../../web-research/browser-agent.service';
import axios from 'axios';

@Injectable()
export class SpecDiscoveryService {
  private readonly logger = new Logger(SpecDiscoveryService.name);

  constructor(
    @InjectRepository(ApiFusionBlueprint)
    private readonly blueprintRepo: Repository<ApiFusionBlueprint>,
    private readonly mcpRegistry: McpProviderRegistryService,
    private readonly browserAgent: BrowserAgentService,
  ) {}

  async discover(
    provider: string,
    userSpecUrl?: string,
  ): Promise<{ specRaw: string; source: string }> {
    // 1. Check for global blueprint first (vault shortcut)
    const globalBlueprint = await this.blueprintRepo.findOne({
      where: { provider, isGlobal: true },
    });

    if (globalBlueprint && globalBlueprint.specRaw) {
      this.logger.log(
        `Found global blueprint for ${provider}. Skipping discovery.`,
      );
      return {
        specRaw: JSON.stringify(globalBlueprint.specRaw),
        source: 'global_vault',
      };
    }

    // 2. Check KNOWN_PROVIDERS registry
    const config = this.mcpRegistry.getMcpConfig(provider);
    const specUrl = userSpecUrl || config?.specUrl;

    if (specUrl) {
      try {
        const response = await axios.get(specUrl);
        return {
          specRaw:
            typeof response.data === 'string'
              ? response.data
              : JSON.stringify(response.data),
          source: specUrl,
        };
      } catch (e) {
        this.logger.warn(`Failed to fetch spec from ${specUrl}: ${e.message}`);
      }
    }

    // 3. Fallback to BrowserAgent scraping
    this.logger.log(
      `Attempting to discover spec for ${provider} via web search...`,
    );
    const searchResults = await this.browserAgent.search(
      `${provider} api documentation openapi spec`,
    );
    if (searchResults.length > 0) {
      const bestUrl = searchResults[0];
      try {
        const scraped = await this.browserAgent.scrape(bestUrl);
        return {
          specRaw: scraped,
          source: bestUrl,
        };
      } catch (e) {
        this.logger.error(`Failed to scrape ${bestUrl}: ${e.message}`);
      }
    }

    throw new Error(
      `Could not discover API specification for provider: ${provider}`,
    );
  }
}
