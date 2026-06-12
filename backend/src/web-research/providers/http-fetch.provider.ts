import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { IBrowserProvider } from './browser-provider.interface';

@Injectable()
export class HttpFetchProvider implements IBrowserProvider {
  readonly name = 'http-fetch';
  private readonly logger = new Logger(HttpFetchProvider.name);

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(_query: string): Promise<string[]> {
    return [];
  }

  async scrape(url: string): Promise<string> {
    try {
      const maxChars = parseInt(
        process.env.BROWSER_MAX_CONTENT_CHARS ?? '8000',
      );
      const res = await axios.get<string>(url, {
        timeout: 10_000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiveSeeks/1.0)' },
        responseType: 'text',
      });
      const $ = cheerio.load(res.data);
      $('script,style,noscript,iframe,img,svg,video,audio').remove();
      const text = ($('body').text() || $.root().text())
        .replace(/\s+/g, ' ')
        .trim();
      return text.substring(0, maxChars);
    } catch (err) {
      this.logger.warn(
        `[HttpFetch] scrape failed for ${url}: ${(err as Error).message}`,
      );
      return '';
    }
  }
}
