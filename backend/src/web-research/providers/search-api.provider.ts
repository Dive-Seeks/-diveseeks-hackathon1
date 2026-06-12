import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IBrowserProvider } from './browser-provider.interface';

@Injectable()
export class SearchApiProvider implements IBrowserProvider {
  readonly name = 'search-api';
  private readonly logger = new Logger(SearchApiProvider.name);

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: string): Promise<string[]> {
    try {
      const urls = await this.instantAnswer(query);
      if (urls.length > 0) return urls.slice(0, 5);
      return (await this.htmlFallback(query)).slice(0, 5);
    } catch (err) {
      this.logger.warn(`[SearchApi] search failed: ${(err as Error).message}`);
      return [];
    }
  }

  // SearchApiProvider only does search — scraping is handled by scrape providers
  async scrape(_url: string): Promise<string> {
    return '';
  }

  private async instantAnswer(query: string): Promise<string[]> {
    const res = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', no_redirect: 1, no_html: 1 },
      timeout: 8000,
    });
    const data = res.data as {
      Results: { FirstURL: string }[];
      RelatedTopics: { FirstURL?: string; Topics?: { FirstURL: string }[] }[];
    };

    const urls: string[] = [];

    for (const r of data.Results ?? []) {
      if (r.FirstURL) urls.push(r.FirstURL);
    }
    for (const t of data.RelatedTopics ?? []) {
      if (t && 'FirstURL' in t && t.FirstURL) urls.push(t.FirstURL);
      if (t && 'Topics' in t && t.Topics) {
        for (const sub of t.Topics) {
          if (sub.FirstURL) urls.push(sub.FirstURL);
        }
      }
    }
    return this.dedup(urls);
  }

  private async htmlFallback(query: string): Promise<string[]> {
    const res = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiveSeeks/1.0)' },
    });
    const html = res.data as string;
    const matches = html.match(/href="(https?:\/\/[^"]+)"/g) ?? [];
    return this.dedup(
      matches
        .map((m) => m.slice(6, -1))
        .filter(
          (u) =>
            !u.includes('duckduckgo.com') &&
            !u.includes('google.com') &&
            u.length < 200,
        ),
    );
  }

  private dedup(urls: string[]): string[] {
    return Array.from(new Set(urls));
  }
}
