import { Injectable, Logger } from '@nestjs/common';
import { SearchApiProvider } from './providers/search-api.provider';
import { CrawleeProvider } from './providers/crawlee.provider';
import { PlaywrightMcpProvider } from './providers/playwright-mcp.provider';
import { FirecrawlProvider } from './providers/firecrawl.provider';
import { HttpFetchProvider } from './providers/http-fetch.provider';

@Injectable()
export class BrowserAgentService {
  private readonly logger = new Logger(BrowserAgentService.name);

  constructor(
    private readonly searchApi: SearchApiProvider,
    private readonly crawlee: CrawleeProvider,
    private readonly playwrightMcp: PlaywrightMcpProvider,
    private readonly firecrawl: FirecrawlProvider,
    private readonly httpFetch: HttpFetchProvider,
  ) {}

  async search(query: string): Promise<string[]> {
    this.logger.log(`[Browser] search: "${query}"`);

    if (
      query.trim().startsWith('http://') ||
      query.trim().startsWith('https://')
    ) {
      this.logger.log(`[Browser] Query is direct URL: ${query}`);
      return [query.trim()];
    }

    const urls = await this.searchApi.search(query);
    if (urls.length > 0) {
      this.logger.log(
        `[Browser] search resolved via search-api (${urls.length} URLs)`,
      );
      return urls;
    }

    if (await this.playwrightMcp.isAvailable()) {
      const playwrightUrls = await this.playwrightMcp.search(query);
      if (playwrightUrls.length > 0) {
        this.logger.log(
          `[Browser] search resolved via playwright-mcp (${playwrightUrls.length} URLs)`,
        );
        return playwrightUrls;
      }
    }

    this.logger.warn(`[Browser] search returned 0 URLs for query: "${query}"`);
    return [];
  }

  async scrape(url: string): Promise<string> {
    this.logger.log(`[Browser] scrape: ${url}`);

    const scrapeProviders = [
      this.crawlee,
      this.playwrightMcp,
      this.firecrawl,
      this.httpFetch,
    ];

    for (const provider of scrapeProviders) {
      if (!(await provider.isAvailable())) {
        this.logger.debug(
          `[Browser] ${provider.name} not available — skipping`,
        );
        continue;
      }
      const text = await provider.scrape(url);
      if (text.length > 0) {
        this.logger.log(
          `[Browser] scrape resolved via ${provider.name} (${text.length} chars)`,
        );
        return text;
      }
      this.logger.debug(
        `[Browser] ${provider.name} returned empty — trying next`,
      );
    }

    this.logger.warn(`[Browser] all scrape providers exhausted for: ${url}`);
    return '';
  }
}
