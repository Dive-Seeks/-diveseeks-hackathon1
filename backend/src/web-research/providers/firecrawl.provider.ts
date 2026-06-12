import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { IBrowserProvider } from './browser-provider.interface';
import { execSync } from 'child_process';

@Injectable()
export class FirecrawlProvider implements IBrowserProvider {
  readonly name = 'openclaw';
  private readonly logger = new Logger(FirecrawlProvider.name);

  isAvailable(): Promise<boolean> {
    try {
      execSync('openclaw --version', { stdio: 'ignore', timeout: 3000 });
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  search(_query: string): Promise<string[]> {
    // OpenClaw search tools (brave, tavily) require API keys.
    // URL discovery is handled by SearchApiProvider — OpenClaw is scrape-only.
    return Promise.resolve([]);
  }

  async scrape(url: string): Promise<string> {
    const maxChars = parseInt(process.env.BROWSER_MAX_CONTENT_CHARS ?? '8000');

    try {
      // Use firecrawl-scrape when FIRECRAWL_API_KEY is set — OpenClaw reads it from env internally
      if (process.env.FIRECRAWL_API_KEY) {
        return await this.firecrawlScrape(url, maxChars);
      }
      return await this.browserScrape(url, maxChars);
    } catch (err) {
      this.logger.warn(
        `[Firecrawl] scrape failed for ${url}: ${(err as Error).message}`,
      );
      return '';
    }
  }

  private async firecrawlScrape(
    url: string,
    maxChars: number,
  ): Promise<string> {
    const client = await this.openClient();
    try {
      // apiKey is read from FIRECRAWL_API_KEY env by OpenClaw internally — not passed as a param
      const result = await client.callTool({
        name: 'firecrawl-scrape',
        arguments: {
          url,
          extractMode: 'text',
          onlyMainContent: true,
          proxy: 'auto',
          timeoutSeconds: 15,
        },
      });
      return this.extractText(result.content).substring(0, maxChars);
    } finally {
      await client.close();
    }
  }

  private async browserScrape(url: string, maxChars: number): Promise<string> {
    const client = await this.openClient();
    try {
      await client.callTool({
        name: 'browser',
        arguments: { action: 'navigate', url },
      });
      const snapshot = await client.callTool({
        name: 'browser',
        arguments: { action: 'snapshot' },
      });
      const text = this.extractText(snapshot.content);
      return text.substring(0, maxChars);
    } finally {
      await client.close();
    }
  }

  private async openClient(): Promise<Client> {
    const transport = new StdioClientTransport({
      command: 'openclaw',
      args: ['mcp', 'serve'],
    });
    const client = new Client({
      name: 'diveseeks-browser-agent',
      version: '1.0.0',
    });
    await client.connect(transport);
    return client;
  }

  private extractText(content: unknown): string {
    if (Array.isArray(content)) {
      return content
        .filter((c: { type?: string }) => c.type === 'text')
        .map((c: { text?: string }) => c.text ?? '')
        .join('\n');
    }
    if (typeof content === 'string') {
      return content;
    }
    if (content == null) {
      return '';
    }
    return JSON.stringify(content);
  }
}
