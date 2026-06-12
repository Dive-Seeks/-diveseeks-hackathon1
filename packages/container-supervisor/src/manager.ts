import type Docker from 'dockerode';
import {
  HERMES_API_PORT,
  HERMES_CONFIG_PATH,
  HERMES_IMAGE,
  HERMES_NETWORK,
} from './hermes.constants';

export interface LlmConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export interface StartConfig {
  apiServerKey: string;
  llm: LlmConfig | null;
}

export class HermesContainerManager {
  constructor(private readonly docker: Docker) {}

  containerName(tenantId: string): string {
    return `hermes-agent-${tenantId}`;
  }

  volumeName(tenantId: string): string {
    return `hermes-agent-data-${tenantId}`;
  }

  async start(tenantId: string, cfg: StartConfig): Promise<void> {
    const name = this.containerName(tenantId);
    const existing = await this.inspectSafe(name);
    if (existing?.State.Running) {
      return;
    }
    if (existing) {
      await this.docker.getContainer(name).start();
      return;
    }

    await this.docker.createVolume({ Name: this.volumeName(tenantId) });
    if (cfg.llm) {
      await this.writeTenantConfig(tenantId, cfg.llm);
    }

    const container = await this.docker.createContainer({
      name,
      Image: HERMES_IMAGE,
      Cmd: ['gateway'],
      Env: [
        'API_SERVER_ENABLED=true',
        'API_SERVER_HOST=0.0.0.0',
        `API_SERVER_PORT=${HERMES_API_PORT}`,
        `API_SERVER_KEY=${cfg.apiServerKey}`,
      ],
      Labels: { 'diveseeks.hermes-agent': '1', 'diveseeks.tenant': tenantId },
      HostConfig: {
        Binds: [`${this.volumeName(tenantId)}:/opt/data`],
        NetworkMode: HERMES_NETWORK,
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });
    await container.start();
  }

  async stop(tenantId: string): Promise<void> {
    const name = this.containerName(tenantId);
    const existing = await this.inspectSafe(name);
    if (existing?.State.Running) {
      await this.docker.getContainer(name).stop({ t: 15 });
    }
  }

  async status(tenantId: string): Promise<'running' | 'stopped' | 'absent'> {
    const existing = await this.inspectSafe(this.containerName(tenantId));
    if (!existing) {
      return 'absent';
    }
    return existing.State.Running ? 'running' : 'stopped';
  }

  /** OpenAI-compatible base URLs per BYOK provider (InternalLlmKeyService union). */
  private static readonly PROVIDER_BASE_URLS: Record<string, string> = {
    openrouter: 'https://openrouter.ai/api/v1',
    openai: 'https://api.openai.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  };

  private async writeTenantConfig(
    tenantId: string,
    llm: LlmConfig,
  ): Promise<void> {
    const baseUrl = HermesContainerManager.PROVIDER_BASE_URLS[llm.provider];
    const config = [
      'model:',
      `  default: ${llm.model}`,
      `  provider: ${llm.provider}`,
      'providers:',
      `  ${llm.provider}:`,
      `    api_key: ${llm.apiKey}`,
      ...(baseUrl ? [`    base_url: ${baseUrl}`] : []),
      '',
    ].join('\n');
    const b64 = Buffer.from(config).toString('base64');
    await this.docker.run(
      'busybox:1.36',
      [
        'sh',
        '-c',
        `mkdir -p $(dirname ${HERMES_CONFIG_PATH}) && echo '${b64}' | base64 -d > ${HERMES_CONFIG_PATH}`,
      ],
      process.stdout,
      {
        HostConfig: {
          Binds: [`${this.volumeName(tenantId)}:/opt/data`],
          AutoRemove: true,
        },
      },
    );
  }

  private async inspectSafe(name: string) {
    try {
      return await this.docker.getContainer(name).inspect();
    } catch (err: any) {
      if (err?.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }
}
