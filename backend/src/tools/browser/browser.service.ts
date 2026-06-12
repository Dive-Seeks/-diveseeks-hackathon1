import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { EventSource } from 'eventsource';

@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private mcpProcess: ChildProcess | null = null;
  private readonly port: number;
  private available = false;

  constructor() {
    this.port = parseInt(process.env.BROWSER_MCP_PORT ?? '3101');
  }

  async onModuleInit(): Promise<void> {
    try {
      // On Windows use `cmd /c npx` — avoids both ENOENT and DEP0190 (shell:true + args)
      const [cmd, args] =
        process.platform === 'win32'
          ? ([
              'cmd',
              [
                '/c',
                'npx',
                '@playwright/mcp@latest',
                '--port',
                String(this.port),
                '--headless',
                '--isolated',
              ],
            ] as const)
          : ([
              'npx',
              [
                '@playwright/mcp@latest',
                '--port',
                String(this.port),
                '--headless',
                '--isolated',
              ],
            ] as const);
      this.mcpProcess = spawn(cmd, [...args], { stdio: 'pipe' });

      this.mcpProcess.stderr?.on('data', (chunk: Buffer) => {
        const msg = chunk.toString().trim();
        if (msg) this.logger.debug(`[playwright-mcp] ${msg}`);
      });

      this.mcpProcess.on('error', (err) => {
        this.logger.warn(`BrowserService: MCP process error: ${err.message}`);
        this.available = false;
      });

      this.mcpProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
          this.logger.warn(
            `BrowserService: MCP process exited with code ${code}`,
          );
        }
        this.available = false;
        this.mcpProcess = null;
      });

      await this.waitForReady(20_000);
      this.available = true;
      this.logger.log(
        `BrowserService: Playwright MCP CLI ready on port ${this.port}`,
      );
    } catch (err) {
      this.logger.warn(
        `BrowserService disabled — Playwright MCP CLI unavailable. Reason: ${(err as Error).message}`,
      );
      this.killProcess();
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.killProcess();
  }

  private killProcess(): void {
    if (!this.mcpProcess) return;
    const proc = this.mcpProcess;
    this.mcpProcess = null;
    this.available = false;
    proc.kill('SIGTERM');
    setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        // already dead
      }
    }, 2_000);
  }

  private waitForReady(timeoutMs: number): Promise<void> {
    const base = `http://localhost:${this.port}`;
    return new Promise((resolve, reject) => {
      let timedOut = false;
      const deadline = setTimeout(() => {
        timedOut = true;
        reject(
          new Error(`Playwright MCP CLI did not start within ${timeoutMs}ms`),
        );
      }, timeoutMs);

      const attempt = () => {
        if (timedOut) return;
        const es = new EventSource(`${base}/sse`);
        es.addEventListener('endpoint', () => {
          clearTimeout(deadline);
          es.close();
          resolve();
        });
        es.onerror = () => {
          es.close();
          if (!timedOut) setTimeout(attempt, 500);
        };
      };

      attempt();
    });
  }

  private get baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  private openSession(): Promise<string> {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${this.baseUrl}/sse`);
      const tid = setTimeout(() => {
        es.close();
        reject(new Error('Playwright MCP session open timed out'));
      }, 10_000);
      es.addEventListener('endpoint', (event) => {
        clearTimeout(tid);
        es.close();
        resolve(event.data as string);
      });
      es.onerror = () => {
        clearTimeout(tid);
        es.close();
        reject(new Error('Playwright MCP unreachable'));
      };
    });
  }

  private async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ text: string }> {
    if (!this.available)
      throw new Error('BrowserService: Playwright MCP unavailable');

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

  async navigate(url: string): Promise<void> {
    await this.callTool('browser_navigate', { url });
  }

  async snapshot(): Promise<string> {
    const { text } = await this.callTool('browser_snapshot', {});
    return text;
  }

  async screenshot(): Promise<Buffer> {
    const { text } = await this.callTool('browser_take_screenshot', {});
    return Buffer.from(text, 'base64');
  }

  async click(selector: string): Promise<void> {
    await this.callTool('browser_click', { selector });
  }

  async type(selector: string, text: string): Promise<void> {
    await this.callTool('browser_type', { selector, text });
  }

  async extractContent(): Promise<string> {
    const { text } = await this.callTool('browser_snapshot', {});
    return text;
  }

  async evaluate(script: string): Promise<unknown> {
    const { text } = await this.callTool('browser_evaluate', {
      expression: script,
    });
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async connectRemoteCDP(_cdpUrl: string): Promise<void> {
    this.logger.warn(
      'BrowserService: connectRemoteCDP not supported in CLI mode',
    );
  }
}
