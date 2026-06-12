import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Or } from 'typeorm';
import { Prompt, PromptKind } from '../entities/prompt.entity';
import { PromptVersion } from '../entities/prompt-version.entity';
import { PromptPartial } from '../entities/prompt-partial.entity';
import { PromptCompilerService } from './prompt-compiler.service';

@Injectable()
export class PromptResolverService {
  constructor(
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(PromptVersion)
    private readonly versionRepo: Repository<PromptVersion>,
    @InjectRepository(PromptPartial)
    private readonly partialRepo: Repository<PromptPartial>,
    private readonly compiler: PromptCompilerService,
  ) {}

  async resolveForRole(
    roleTarget: string,
    tenantId: string,
    context: Record<string, unknown> = {},
  ): Promise<string> {
    const prompt = await this.findPrompt(
      { kind: PromptKind.ROLE, roleTarget },
      tenantId,
    );
    return this.resolvePrompt(prompt, context, tenantId);
  }

  async resolveBySlug(
    slug: string,
    tenantId: string,
    variables: Record<string, unknown> = {},
  ): Promise<string> {
    const prompt = await this.findPromptBySlug(slug, tenantId);
    return this.resolvePrompt(prompt, variables, tenantId);
  }

  private async resolvePrompt(
    prompt: Prompt,
    variables: Record<string, unknown>,
    tenantId: string,
  ): Promise<string> {
    if (!prompt.currentVersionId) {
      throw new BadRequestException(
        `Prompt "${prompt.slug}" has no published version`,
      );
    }

    const version = await this.versionRepo.findOne({
      where: { id: prompt.currentVersionId },
    });
    if (!version)
      throw new NotFoundException(
        `Version ${prompt.currentVersionId} not found`,
      );

    const partialsMap = await this.loadPartials(version.partialRefs, tenantId);

    for (const v of version.variableSchema) {
      if (v.required && !(v.name in variables)) {
        if (v.default !== undefined) {
          variables[v.name] = v.default;
        } else {
          throw new BadRequestException(
            `Required variable "${v.name}" missing for prompt "${prompt.slug}"`,
          );
        }
      }
    }

    return this.compiler.compile(version.body, variables, partialsMap);
  }

  private async loadPartials(
    slugs: string[],
    tenantId: string,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!slugs.length) return map;

    const partials = await this.partialRepo
      .createQueryBuilder('p')
      .where('p.slug IN (:...slugs)', { slugs })
      .andWhere('(p.tenantId = :tenantId OR p.tenantId IS NULL)', { tenantId })
      .orderBy('p.tenantId', 'DESC')
      .getMany();

    for (const p of partials) {
      if (!map.has(p.slug)) map.set(p.slug, p.body);
    }
    return map;
  }

  private async findPrompt(
    criteria: { kind: PromptKind; roleTarget?: string },
    tenantId: string,
  ): Promise<Prompt> {
    const prompt = await this.promptRepo
      .createQueryBuilder('p')
      .where('p.kind = :kind', { kind: criteria.kind })
      .andWhere('p.roleTarget = :roleTarget', {
        roleTarget: criteria.roleTarget,
      })
      .andWhere('p.archived = false')
      .andWhere('(p.tenantId = :tenantId OR p.tenantId IS NULL)', { tenantId })
      .orderBy('p.tenantId', 'DESC')
      .getOne();

    if (!prompt)
      throw new NotFoundException(
        `No ${criteria.kind} prompt for role "${criteria.roleTarget}"`,
      );
    return prompt;
  }

  private async findPromptBySlug(
    slug: string,
    tenantId: string,
  ): Promise<Prompt> {
    const prompt = await this.promptRepo
      .createQueryBuilder('p')
      .where('p.slug = :slug', { slug })
      .andWhere('p.archived = false')
      .andWhere('(p.tenantId = :tenantId OR p.tenantId IS NULL)', { tenantId })
      .orderBy('p.tenantId', 'DESC')
      .getOne();

    if (!prompt) throw new NotFoundException(`Prompt "${slug}" not found`);
    return prompt;
  }
}
