import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class ContentCleanerService {
  clean(html: string): string {
    // Strip HTML tags and normalize whitespace
    try {
      const $ = cheerio.load(html);
      // Remove scripts, styles, and other non-content tags
      $('script, style, noscript, iframe, img, svg, video, audio').remove();

      const text = $('body').text() || $.root().text();
      return text.replace(/\s+/g, ' ').trim();
    } catch (e) {
      // Fallback if not valid HTML
      return html
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
}
