import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentSkill } from './skill.entity';
import { CreateSkillDto, UpdateSkillDto, SkillManifest } from './skill.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);
  private readonly skillsBasePath: string;

  constructor(
    @InjectRepository(AgentSkill)
    private readonly repo: Repository<AgentSkill>,
  ) {
    this.skillsBasePath = path.resolve(process.cwd(), 'agents', 'skills');
  }

  /** Scan the skills/ directory on disk and return all SKILL.md manifests */
  async scanSkillFiles(): Promise<SkillManifest[]> {
    const manifests: SkillManifest[] = [];
    if (!fs.existsSync(this.skillsBasePath)) return manifests;

    const dirs = fs
      .readdirSync(this.skillsBasePath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const dir of dirs) {
      const skillMdPath = path.join(this.skillsBasePath, dir.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;
      const raw = fs.readFileSync(skillMdPath, 'utf-8');
      const manifest = this.parseSkillMd(raw);
      manifest.filePath = skillMdPath;
      if (!manifest.name) manifest.name = dir.name;

      // ADK L3: load references/ directory content
      const refsDir = path.join(this.skillsBasePath, dir.name, 'references');
      if (fs.existsSync(refsDir)) {
        const refFiles = fs
          .readdirSync(refsDir)
          .filter((f) => f.endsWith('.md'))
          .sort();
        if (refFiles.length > 0) {
          const refs = refFiles
            .map((f) => fs.readFileSync(path.join(refsDir, f), 'utf-8').trim())
            .join('\n\n');
          manifest.body += `\n\n---\n\n## References\n\n${refs}`;
        }
      }

      manifests.push(manifest);
    }
    return manifests;
  }

  /** Parse SKILL.md frontmatter (--- yaml ---) + body */
  parseSkillMd(raw: string): SkillManifest {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = raw.match(frontmatterRegex);

    const manifest: SkillManifest = {
      name: '',
      domain: null,
      description: '',
      targetRoles: [],
      body: raw,
      filePath: '',
    };

    if (!match) {
      manifest.body = raw;
      return manifest;
    }

    const yamlBlock = match[1];
    manifest.body = match[2].trim();

    for (const line of yamlBlock.split('\n')) {
      const [key, ...rest] = line.split(':');
      if (!key || rest.length === 0) continue;
      const value = rest.join(':').trim();
      if (key.trim() === 'name') manifest.name = value;
      else if (key.trim() === 'domain') manifest.domain = value || null;
      else if (key.trim() === 'description') manifest.description = value;
      else if (key.trim() === 'roles')
        manifest.targetRoles = value.split(',').map((r) => r.trim());
    }

    return manifest;
  }

  /** Get all active skills for a tenant + agent role/domain */
  async getActiveSkillsFor(
    tenantId: string,
    role: string,
    domain: string,
  ): Promise<AgentSkill[]> {
    const rows = await this.repo.find({ where: { tenantId, active: true } });
    const global = await this.repo.find({
      where: { tenantId: null as any, active: true },
    });
    const all = [...global, ...rows];
    return all.filter(
      (s) =>
        (!s.domain || s.domain === domain) &&
        (s.targetRoles.length === 0 || s.targetRoles.includes(role)),
    );
  }

  /** Assemble injected skill text for a given agent — to append to soul prompt */
  async assembleSkillsPrompt(
    tenantId: string,
    role: string,
    domain: string,
  ): Promise<string> {
    const active = await this.getActiveSkillsFor(tenantId, role, domain);
    if (active.length === 0) return '';

    const all = await this.scanSkillFiles();
    const fileMap = new Map(all.map((m) => [m.name, m]));
    const parts: string[] = ['## Active Skills\n'];

    for (const skill of active) {
      const manifest = fileMap.get(skill.skillName);
      if (!manifest) continue;
      parts.push(`### ${manifest.name}\n${manifest.body}`);
    }

    return parts.join('\n\n');
  }

  async findAll(tenantId: string): Promise<AgentSkill[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async create(tenantId: string, dto: CreateSkillDto): Promise<AgentSkill> {
    const skill = this.repo.create({
      tenantId,
      ...dto,
      active: dto.active ?? true,
    });
    return this.repo.save(skill);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateSkillDto,
  ): Promise<AgentSkill> {
    await this.repo.update({ id, tenantId }, dto);
    return this.repo.findOne({ where: { id } }) as Promise<AgentSkill>;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
