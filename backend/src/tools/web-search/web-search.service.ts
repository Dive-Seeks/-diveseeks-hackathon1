import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  async search(query: string, country = 'GB'): Promise<SearchResult[]> {
    const apiKey = process.env.BRAVE_API_KEY;
    if (apiKey) {
      return this.searchBrave(query, country, apiKey);
    }
    this.logger.warn('BRAVE_API_KEY not set — falling back to DuckDuckGo');
    return this.searchDuckDuckGo(query);
  }

  private async searchBrave(
    query: string,
    country: string,
    apiKey: string,
  ): Promise<SearchResult[]> {
    const { data } = await axios.get<{
      web: {
        results: Array<{ title: string; url: string; description: string }>;
      };
    }>('https://api.search.brave.com/res/v1/web/search', {
      params: { q: query, count: 10, country },
      headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
      timeout: 10_000,
    });
    return (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? '',
    }));
  }

  private async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const { data } = await axios.get<{
      RelatedTopics: Array<{ FirstURL?: string; Text?: string }>;
    }>('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', no_html: 1 },
      timeout: 10_000,
    });
    return (data.RelatedTopics ?? [])
      .filter((t) => t.FirstURL)
      .slice(0, 10)
      .map((t) => ({
        title: (t.Text ?? '').split(' - ')[0] ?? '',
        url: t.FirstURL ?? '',
        snippet: t.Text ?? '',
      }));
  }
}
