import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentPlugin } from './plugin.entity';
import { CreatePluginDto, UpdatePluginDto, PluginManifest } from './plugin.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PluginService {
  private readonly logger = new Logger(PluginService.name);
  private readonly pluginsBasePath: string;

  constructor(
    @InjectRepository(AgentPlugin)
    private readonly repo: Repository<AgentPlugin>,
  ) {
    this.pluginsBasePath = path.resolve(process.cwd(), 'agents', 'plugins');
  }

  /** Scan plugins/ directory for PLUGIN.json manifests */
  async scanPluginFiles(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];
    if (!fs.existsSync(this.pluginsBasePath)) return manifests;

    const dirs = fs
      .readdirSync(this.pluginsBasePath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const dir of dirs) {
      const pluginJsonPath = path.join(
        this.pluginsBasePath,
        dir.name,
        'PLUGIN.json',
      );
      if (!fs.existsSync(pluginJsonPath)) continue;
      const raw = fs.readFileSync(pluginJsonPath, 'utf-8');
      try {
        const manifest = this.parsePluginManifest(raw);
        manifest.filePath = pluginJsonPath;
        manifests.push(manifest);
      } catch (e) {
        this.logger.warn(
          `Failed to parse plugin manifest ${pluginJsonPath}: ${(e as Error).message}`,
        );
      }
    }
    return manifests;
  }

  /** Parse PLUGIN.json content into PluginManifest */
  parsePluginManifest(raw: string): PluginManifest {
    const json = JSON.parse(raw);
    return {
      name: json.name ?? '',
      description: json.description ?? '',
      version: json.version ?? '1.0.0',
      domains: Array.isArray(json.domains) ? json.domains : [],
      tools: Array.isArray(json.tools) ? json.tools : [],
      executionMode: json.executionMode ?? 'sandbox',
      hooks: Array.isArray(json.hooks) ? json.hooks : [],
      permissions: Array.isArray(json.permissions) ? json.permissions : [],
      filePath: '',
    };
  }

  /** Get active plugins for a tenant + domain, merged with platform defaults */
  async getActivePluginsFor(
    tenantId: string,
    domain: string,
  ): Promise<AgentPlugin[]> {
    const global = await this.repo.find({
      where: { tenantId: null as any, active: true },
    });
    const tenant = await this.repo.find({ where: { tenantId, active: true } });
    const all = [...global, ...tenant];
    return all.filter(
      (p) => p.domains.length === 0 || p.domains.includes(domain),
    );
  }

  /** Assemble tool descriptions from active plugins for injection into TOOLS.md section */
  async assemblePluginToolsPrompt(
    tenantId: string,
    domain: string,
  ): Promise<string> {
    const active = await this.getActivePluginsFor(tenantId, domain);
    if (active.length === 0) return '';

    const all = await this.scanPluginFiles();
    const fileMap = new Map(all.map((m) => [m.name, m]));
    const parts: string[] = ['## Plugin Tools\n'];

    for (const plugin of active) {
      const manifest = fileMap.get(plugin.pluginName);
      if (!manifest) continue;
      parts.push(
        `### ${manifest.name} (v${manifest.version})\n${manifest.description}`,
      );
      for (const tool of manifest.tools) {
        parts.push(`- **${tool.name}**: ${tool.description}`);
      }
    }

    return parts.join('\n\n');
  }

  async findAll(tenantId: string): Promise<AgentPlugin[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async create(tenantId: string, dto: CreatePluginDto): Promise<AgentPlugin> {
    const plugin = this.repo.create({
      tenantId,
      ...dto,
      active: dto.active ?? true,
    });
    return this.repo.save(plugin);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePluginDto,
  ): Promise<AgentPlugin> {
    await this.repo.update({ id, tenantId }, dto);
    return this.repo.findOne({ where: { id } }) as Promise<AgentPlugin>;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
