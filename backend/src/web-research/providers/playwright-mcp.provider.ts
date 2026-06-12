import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { EventSource } from 'eventsource';
import { IBrowserProvider } from './browser-provider.interface';

@Injectable()
export class PlaywrightMcpProvider implements IBrowserProvider {
  readonly name = 'playwright-mcp';
  private readonly logger = new Logger(PlaywrightMcpProvider.name);

  private get baseUrl(): string {
    return process.env.PLAYWRIGHT_MCP_URL ?? 'http://localhost:3100';
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const es = new EventSource(`${this.baseUrl}/sse`);
      const t = setTimeout(() => {
        es.close();
        resolve(false);
      }, 3_000);
      es.addEventListener('endpoint', () => {
        clearTimeout(t);
        es.close();
        resolve(true);
      });
      es.onerror = () => {
        clearTimeout(t);
        es.close();
        resolve(false);
      };
    });
  }

  async search(query: string): Promise<string[]> {
    try {
      await this.callTool('playwright_navigate', {
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      });
      const waitMs = Math.min(
        parseInt(process.env.BROWSER_SEARCH_TIMEOUT_MS ?? '10000'),
        5000,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      const { text } = await this.callTool('playwright_get_page_text', {});
      return this.extractUrls(text).slice(0, 5);
    } catch (err) {
      this.logger.warn(
        `[PlaywrightMcp] search failed: ${(err as Error).message}`,
      );
      return [];
    }
  }

  async scrape(url: string): Promise<string> {
    try {
      const timeout = parseInt(
        process.env.BROWSER_SCRAPE_TIMEOUT_MS ?? '10000',
      );
      await Promise.race([
        this.callTool('playwright_navigate', { url }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('Navigate timeout')), timeout),
        ),
      ]);
      const { text } = await this.callTool('playwright_get_page_text', {});
      const maxChars = parseInt(
        process.env.BROWSER_MAX_CONTENT_CHARS ?? '8000',
      );
      return text.substring(0, maxChars);
    } catch (err) {
      this.logger.warn(
        `[PlaywrightMcp] scrape failed for ${url}: ${(err as Error).message}`,
      );
      return '';
    }
  }

  private async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ text: string }> {
    const sessionEndpoint = await this.openSession();
    const postUrl = sessionEndpoint.startsWith('http')
      ? sessionEndpoint
      : `${this.baseUrl}${sessionEndpoint}`;

    return new Promise((resolve, reject) => {
      const es = new EventSource(`${this.baseUrl}/sse`);
      let settled = false;
      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        es.close();
        fn();
      };
      const tid = setTimeout(
        () => done(() => reject(new Error(`MCP tool '${name}' timed out`))),
        30_000,
      );
      tid.unref();
      es.addEventListener('message', (event) => {
        clearTimeout(tid);
        try {
          const data = JSON.parse(event.data as string);
          if (data.error) {
            done(() => reject(new Error(data.error.message)));
            return;
          }
          const content = data.result?.content;
          const text =
            Array.isArray(content) && content[0]?.text
              ? (content[0].text as string)
              : JSON.stringify(data.result ?? '');
          done(() => resolve({ text }));
        } catch (e) {
          done(() => reject(e));
        }
      });
      es.onerror = (err) => {
        clearTimeout(tid);
        done(() => reject(new Error(`SSE error: ${String(err)}`)));
      };
      es.addEventListener('open', () => {
        axios
          .post(
            postUrl,
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name, arguments: args },
            },
            { headers: { 'Content-Type': 'application/json' } },
          )
          .catch((e) => {
            clearTimeout(tid);
            done(() => reject(e));
          });
      });
    });
  }

  private openSession(): Promise<string> {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${this.baseUrl}/sse`);
      const tid = setTimeout(() => {
        es.close();
        reject(new Error('Playwright MCP session open timed out'));
      }, 10_000);
      tid.unref();
      es.addEventListener('endpoint', (event) => {
        clearTimeout(tid);
        es.close();
        resolve(event.data as string);
      });
      es.onerror = (err) => {
        clearTimeout(tid);
        es.close();
        reject(new Error(`Playwright MCP unreachable: ${String(err)}`));
      };
    });
  }

  private extractUrls(text: string): string[] {
    const matches = text.match(/(https?:\/\/[^\s]+)/g) ?? [];
    return Array.from(new Set(matches)).filter(
      (u) =>
        !u.includes('duckduckgo.com') &&
        !u.includes('google.com') &&
        u.length < 200,
    );
  }
}
