import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentRule } from './rule.entity';
import { CreateRuleDto, UpdateRuleDto } from './rule.dto';
import { TsvLoaderUtil } from '../../jos/tsv-loader.util';
import * as path from 'path';

@Injectable()
export class RuleService {
  private readonly logger = new Logger(RuleService.name);
  private readonly rulesBasePath: string;

  constructor(
    @InjectRepository(AgentRule)
    private readonly repo: Repository<AgentRule>,
  ) {
    this.rulesBasePath = path.resolve(__dirname, '..', '..', 'jos', 'rules');
  }

  /** Parse raw TSV string into array of row objects */
  parseTsv(raw: string): Record<string, string>[] {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split('\t').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split('\t');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = vals[i]?.trim() ?? '';
      });
      return row;
    });
  }

  /** Serialize headers + rows back to TSV string */
  serializeToTsv(columns: string[], rows: Record<string, string>[]): string {
    const header = columns.join('\t');
    const body = rows
      .map((r) => columns.map((c) => r[c] ?? '').join('\t'))
      .join('\n');
    return `${header}\n${body}`;
  }

  /** Read built-in TSV rule file for a domain */
  async readBuiltinRules(
    businessType: string,
    domain: string,
  ): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
    const filePath = path.join(
      this.rulesBasePath,
      businessType,
      `${domain}.tsv`,
    );
    try {
      const rows = await TsvLoaderUtil.readTsv(filePath);
      if (rows.length === 0) return { columns: [], rows: [] };
      const columns = Object.keys(rows[0]);
      return { columns, rows };
    } catch {
      return { columns: [], rows: [] };
    }
  }

  /** Get merged rules: tenant overrides take precedence over built-in */
  async getMergedRules(
    tenantId: string,
    businessType: string,
    domain: string,
  ): Promise<Record<string, string>[]> {
    const builtin = await this.readBuiltinRules(businessType, domain);
    const override = await this.repo.findOne({
      where: { tenantId, domain, active: true },
    });
    if (override) return override.rows;
    return builtin.rows;
  }

  /** Write tenant rule override back to DB */
  async upsert(tenantId: string, dto: CreateRuleDto): Promise<AgentRule> {
    const existing = await this.repo.findOne({
      where: { tenantId, domain: dto.domain, ruleKey: dto.ruleKey },
    });
    if (existing) {
      await this.repo.update(existing.id, {
        rows: dto.rows,
        columns: dto.columns,
        active: dto.active ?? true,
      });
      return this.repo.findOne({
        where: { id: existing.id },
      }) as Promise<AgentRule>;
    }
    const rule = this.repo.create({
      tenantId,
      ...dto,
      active: dto.active ?? true,
    });
    return this.repo.save(rule);
  }

  async findByDomain(
    tenantId: string,
    domain: string,
  ): Promise<AgentRule | null> {
    return this.repo.findOne({ where: { tenantId, domain } });
  }

  async findAll(tenantId: string): Promise<AgentRule[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateRuleDto,
  ): Promise<AgentRule> {
    await this.repo.update({ id, tenantId }, dto);
    return this.repo.findOne({ where: { id } }) as Promise<AgentRule>;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
