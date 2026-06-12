import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FetchResult {
  title: string;
  markdown: string;
}

@Injectable()
export class WebFetchService {
  private readonly logger = new Logger(WebFetchService.name);

  async fetchPage(url: string): Promise<FetchResult> {
    const { data } = await axios.get<string>(url, {
      timeout: 10_000,
      headers: { 'User-Agent': 'DivePOS-Agent/1.0' },
    });
    return this.extractContent(data);
  }

  async fetchWithFirecrawl(url: string): Promise<FetchResult> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      this.logger.warn('FIRECRAWL_API_KEY not set — falling back to fetchPage');
      return this.fetchPage(url);
    }
    try {
      const { data } = await axios.post<{
        data: { markdown: string; metadata: { title: string } };
      }>(
        'https://api.firecrawl.dev/v1/scrape',
        { url, formats: ['markdown'] },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30_000 },
      );
      return {
        title: data.data.metadata.title ?? '',
        markdown: data.data.markdown ?? '',
      };
    } catch (err) {
      this.logger.warn(
        `Firecrawl failed: ${(err as Error).message} — falling back to fetchPage`,
      );
      return this.fetchPage(url);
    }
  }

  private extractContent(html: string): FetchResult {
    const $ = cheerio.load(html);
    $(
      'nav, footer, script, style, header, aside, [role="banner"], [role="navigation"]',
    ).remove();
    const title = $('title').text().trim();
    const bodyText = $('body')
      .text()
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { title, markdown: bodyText };
  }
}
