import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DataSource } from 'typeorm';

@Injectable()
export class LlmProbeService {
  private readonly logger = new Logger(LlmProbeService.name);
  private readonly timeout = parseInt(
    process.env.CYCLE_AUDIT_LLM_PROBE_TIMEOUT_MS || '5000',
  );

  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<{
    server: Record<string, { status: string; latencyMs?: number }>;
    tenantKeys: Record<
      string,
      { provider: string; status: string; latencyMs?: number }
    >;
    alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }>;
  }> {
    if (process.env.CYCLE_AUDIT_LLM_PROBE_ENABLED === 'false') {
      return { server: {}, tenantKeys: {}, alerts: [] };
    }

    const alerts: Array<{
      probe: string;
      severity: 'critical' | 'degraded';
      message: string;
    }> = [];
    const serverResults: Record<string, any> = {};

    // --- Phase 1: Server Keys ---
    const serverProbes = [
      {
        id: 'deepseek',
        key: process.env.DEEPSEEK_API_KEY,
        provider: 'deepseek',
      },
      { id: 'gemini', key: process.env.GOOGLE_AI_API_KEY, provider: 'google' },
      { id: 'openai', key: process.env.OPENAI_API_KEY, provider: 'openai' },
      {
        id: 'openrouter',
        key: process.env.OPENROUTER_API_KEY,
        provider: 'openrouter',
      },
    ];

    await Promise.all(
      serverProbes.map(async (p) => {
        if (!p.key) {
          serverResults[p.id] = { status: 'missing' };
          alerts.push({
            probe: `llm:${p.id}`,
            severity: 'critical',
            message: `${p.id.toUpperCase()} API key is missing`,
          });
          return;
        }

        const result = await this.probeKey(p.provider, p.key);
        serverResults[p.id] = result;

        if (result.status !== 'ok') {
          alerts.push({
            probe: `llm:${p.id}`,
            severity: result.status === 'timeout' ? 'degraded' : 'critical',
            message: `${p.id.toUpperCase()} key status: ${result.status}`,
          });
        }
      }),
    );

    // --- Phase 2: Tenant Keys — skipped (user keys are per-user, encrypted, not probed at audit time) ---
    const tenantResults: Record<string, any> = {};

    return {
      server: serverResults,
      tenantKeys: tenantResults,
      alerts,
    };
  }

  private async probeKey(
    provider: string,
    key: string,
  ): Promise<{ status: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      let response;
      switch (provider) {
        case 'openai':
          response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'hi' }],
              max_tokens: 1,
            },
            {
              headers: { Authorization: `Bearer ${key}` },
              timeout: this.timeout,
            },
          );
          break;
        case 'deepseek':
          response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
              model: 'deepseek-chat',
              messages: [{ role: 'user', content: 'hi' }],
              max_tokens: 1,
            },
            {
              headers: { Authorization: `Bearer ${key}` },
              timeout: this.timeout,
            },
          );
          break;
        case 'google':
          response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
            {
              contents: [{ parts: [{ text: 'hi' }] }],
              generationConfig: { maxOutputTokens: 1 },
            },
            { timeout: this.timeout },
          );
          break;
        case 'openrouter':
          response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${key}` },
            timeout: this.timeout,
          });
          break;
        default:
          return { status: 'unknown_provider' };
      }

      if (response.status >= 200 && response.status < 300) {
        return { status: 'ok', latencyMs: Date.now() - start };
      }
      return { status: `error_${response.status}` };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) return { status: 'timeout' };
        if (error.response.status === 401 || error.response.status === 403)
          return { status: 'invalid' };
        if (error.response.status === 429) return { status: 'quota_exhausted' };
        return { status: `error_${error.response.status}` };
      }
      return { status: 'error' };
    }
  }
}
