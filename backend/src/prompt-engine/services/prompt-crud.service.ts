import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  Prompt,
  PromptKind,
  PromptReleaseLabel,
} from '../entities/prompt.entity';
import { PromptPartial } from '../entities/prompt-partial.entity';
import { PromptVersionService } from './prompt-version.service';
import {
  CreatePromptDto,
  UpdatePromptDto,
  QueryPromptsDto,
  CreatePartialDto,
  UpdatePartialDto,
} from '../dto/prompt.dto';

@Injectable()
export class PromptCrudService {
  constructor(
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(PromptPartial)
    private readonly partialRepo: Repository<PromptPartial>,
    private readonly versionService: PromptVersionService,
  ) {}

  async create(
    dto: CreatePromptDto,
    tenantId: string,
    userId: string,
  ): Promise<Prompt> {
    const existing = await this.promptRepo.findOne({
      where: { slug: dto.slug, tenantId },
    });
    if (existing)
      throw new ConflictException(
        `Prompt slug "${dto.slug}" already exists in this tenant`,
      );

    const prompt = await this.promptRepo.save(
      this.promptRepo.create({
        tenantId,
        slug: dto.slug,
        kind: dto.kind,
        title: dto.title,
        description: dto.description,
        roleTarget: dto.roleTarget,
        domain: dto.domain,
        releaseLabel: dto.releaseLabel ?? PromptReleaseLabel.DEV,
        tags: dto.tags ?? [],
        archived: false,
        createdBy: userId,
      }),
    );

    const version = await this.versionService.createVersion(
      prompt.id,
      dto.body,
      {
        variableSchema: dto.variableSchema,
        partialRefs: dto.partialRefs,
        createdBy: userId,
      },
    );

    await this.versionService.publish(prompt.id, version.id);
    return this.promptRepo.findOneOrFail({ where: { id: prompt.id } });
  }

  async list(tenantId: string, query: QueryPromptsDto): Promise<Prompt[]> {
    const qb = this.promptRepo
      .createQueryBuilder('p')
      .where('(p.tenantId = :tenantId OR p.tenantId IS NULL)', { tenantId });

    if (query.kind) qb.andWhere('p.kind = :kind', { kind: query.kind });
    if (query.roleTarget)
      qb.andWhere('p.roleTarget = :roleTarget', {
        roleTarget: query.roleTarget,
      });
    if (query.domain)
      qb.andWhere('p.domain = :domain', { domain: query.domain });
    if (query.tag) qb.andWhere(':tag = ANY(p.tags)', { tag: query.tag });
    if (!query.archived) qb.andWhere('p.archived = false');

    return qb.orderBy('p.updatedAt', 'DESC').getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Prompt> {
    const p = await this.promptRepo
      .createQueryBuilder('p')
      .where('p.id = :id', { id })
      .andWhere('(p.tenantId = :tenantId OR p.tenantId IS NULL)', { tenantId })
      .getOne();
    if (!p) throw new NotFoundException(`Prompt ${id} not found`);
    return p;
  }

  async update(
    id: string,
    dto: UpdatePromptDto,
    tenantId: string,
  ): Promise<Prompt> {
    const p = await this.findOne(id, tenantId);
    if (!p.tenantId)
      throw new ConflictException('Cannot modify platform-wide prompts');
    Object.assign(p, dto);
    return this.promptRepo.save(p);
  }

  async archive(id: string, tenantId: string): Promise<void> {
    const p = await this.findOne(id, tenantId);
    if (!p.tenantId)
      throw new ConflictException('Cannot archive platform-wide prompts');
    await this.promptRepo.update(id, { archived: true });
  }

  async createPartial(
    dto: CreatePartialDto,
    tenantId: string,
    userId: string,
  ): Promise<PromptPartial> {
    const existing = await this.partialRepo.findOne({
      where: { slug: dto.slug, tenantId },
    });
    if (existing)
      throw new ConflictException(`Partial slug "${dto.slug}" already exists`);

    const contentHash = crypto
      .createHash('sha256')
      .update(dto.body)
      .digest('hex');
    return this.partialRepo.save(
      this.partialRepo.create({
        tenantId,
        slug: dto.slug,
        title: dto.title,
        body: dto.body,
        contentHash,
        createdBy: userId,
        isActive: true,
      }),
    );
  }

  async listPartials(tenantId: string): Promise<PromptPartial[]> {
    return this.partialRepo
      .createQueryBuilder('p')
      .where('(p.tenantId = :tenantId OR p.tenantId IS NULL)', { tenantId })
      .andWhere('p.isActive = true')
      .orderBy('p.slug')
      .getMany();
  }

  async updatePartial(
    id: string,
    dto: UpdatePartialDto,
    tenantId: string,
  ): Promise<PromptPartial> {
    const partial = await this.partialRepo.findOne({ where: { id, tenantId } });
    if (!partial) throw new NotFoundException(`Partial ${id} not found`);
    if (dto.body) {
      partial.body = dto.body;
      partial.contentHash = crypto
        .createHash('sha256')
        .update(dto.body)
        .digest('hex');
    }
    if (dto.title) partial.title = dto.title;
    return this.partialRepo.save(partial);
  }
}
