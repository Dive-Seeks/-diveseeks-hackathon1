import { Injectable } from '@nestjs/common';
import { KNOWN_PROVIDERS } from '../providers/known-providers.registry';
import { KnownProvider } from '../interfaces/api-fusion.interfaces';

@Injectable()
export class McpProviderRegistryService {
  hasMcpServer(provider: string): boolean {
    const config = KNOWN_PROVIDERS[provider.toLowerCase()];
    return !!config?.mcpServerUrl;
  }

  getMcpConfig(provider: string): KnownProvider | null {
    return KNOWN_PROVIDERS[provider.toLowerCase()] || null;
  }

  listNativeMcpProviders(): string[] {
    return Object.keys(KNOWN_PROVIDERS).filter(
      (p) => !!KNOWN_PROVIDERS[p].mcpServerUrl,
    );
  }

  /** Fuzzy matches provider names (e.g. "facebook ads" -> "facebook") */
  resolveProviderName(input: string): string {
    const normalized = input.toLowerCase().trim();

    // Direct match
    if (KNOWN_PROVIDERS[normalized]) return normalized;

    // Partial match
    const found = Object.keys(KNOWN_PROVIDERS).find(
      (p) => normalized.includes(p) || p.includes(normalized),
    );

    return found || normalized;
  }
}
