import { Injectable } from '@nestjs/common';
import {
  MarketplaceListing,
  AssetType,
} from '../entities/marketplace-listing.entity';

/**
 * Generates A2A Protocol Agent Cards (/.well-known/agent.json format)
 * per the Agent-to-Agent Protocol spec (Google / Linux Foundation, 2026).
 */
@Injectable()
export class AgentCardService {
  generate(listing: MarketplaceListing, baseUrl: string): Record<string, any> {
    return {
      $schema: 'https://a2a-protocol.org/schemas/agent-card/v1.0',
      id: listing.slug,
      name: listing.title,
      description: listing.description,
      version: '1.0',
      publisher: {
        tenantId: listing.publisherTenantId,
        contact: null,
      },
      capabilities: this.buildCapabilities(listing),
      endpoints: {
        invoke: `${baseUrl}/api/marketplace/${listing.slug}/invoke`,
        stream: `${baseUrl}/api/marketplace/${listing.slug}/stream`,
        status: `${baseUrl}/api/marketplace/${listing.slug}/status`,
      },
      permissions: ['read', 'execute'],
      tags: listing.tags,
      license: listing.licenseSpdx ?? 'proprietary',
      verifiedAt: listing.verified ? new Date().toISOString() : null,
    };
  }

  private buildCapabilities(listing: MarketplaceListing): Record<string, any> {
    switch (listing.assetType) {
      case AssetType.AGENT:
        return (
          listing.agentCardJson?.capabilities ?? {
            streaming: true,
            multiTurn: true,
          }
        );
      case AssetType.MCP_SERVER:
        return { mcp: true, tools: listing.mcpManifestJson?.tools ?? [] };
      case AssetType.WORKFLOW:
        return { workflow: true, dag: true };
      default:
        return { general: true };
    }
  }
}
