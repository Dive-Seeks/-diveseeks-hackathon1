import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Prompt } from '../entities/prompt.entity';
import {
  PromptVersion,
  PromptVersionStatus,
  VariableSchema,
} from '../entities/prompt-version.entity';

@Injectable()
export class PromptVersionService {
  constructor(
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
    @InjectRepository(PromptVersion)
    private readonly versionRepo: Repository<PromptVersion>,
  ) {}

  async createVersion(
    promptId: string,
    body: string,
    opts: {
      variableSchema?: VariableSchema[];
      partialRefs?: string[];
      changeNote?: string;
      createdBy?: string;
    } = {},
  ): Promise<PromptVersion> {
    const prompt = await this.promptRepo.findOne({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException(`Prompt ${promptId} not found`);

    const contentHash = crypto.createHash('sha256').update(body).digest('hex');

    const existing = await this.versionRepo.findOne({
      where: { promptId, contentHash },
    });
    if (existing)
      throw new BadRequestException(
        'Identical version already exists (same content hash)',
      );

    const last = await this.versionRepo.findOne({
      where: { promptId },
      order: { version: 'DESC' },
    });

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        promptId,
        version: (last?.version ?? 0) + 1,
        contentHash,
        body,
        variableSchema: opts.variableSchema ?? [],
        partialRefs: opts.partialRefs ?? [],
        changeNote: opts.changeNote,
        parentVersionId: last?.id ?? undefined,
        status: PromptVersionStatus.DRAFT,
        createdBy: opts.createdBy,
      }),
    );

    return version;
  }

  async publish(promptId: string, versionId: string): Promise<Prompt> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, promptId },
    });
    if (!version) throw new NotFoundException('Version not found');

    await this.versionRepo.update(versionId, {
      status: PromptVersionStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    await this.promptRepo.update(promptId, { currentVersionId: versionId });
    return this.promptRepo.findOneOrFail({ where: { id: promptId } });
  }

  async rollback(promptId: string, versionId: string): Promise<Prompt> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, promptId },
    });
    if (!version) throw new NotFoundException('Version not found');
    await this.promptRepo.update(promptId, { currentVersionId: versionId });
    return this.promptRepo.findOneOrFail({ where: { id: promptId } });
  }

  async diff(
    promptId: string,
    fromVersion: number,
    toVersion: number,
  ): Promise<{ from: string; to: string }> {
    const [from, to] = await Promise.all([
      this.versionRepo.findOne({ where: { promptId, version: fromVersion } }),
      this.versionRepo.findOne({ where: { promptId, version: toVersion } }),
    ]);
    if (!from || !to)
      throw new NotFoundException('One or both versions not found');
    return { from: from.body, to: to.body };
  }

  async listVersions(promptId: string): Promise<PromptVersion[]> {
    return this.versionRepo.find({
      where: { promptId },
      order: { version: 'DESC' },
    });
  }

  async getVersion(
    promptId: string,
    versionId: string,
  ): Promise<PromptVersion> {
    const v = await this.versionRepo.findOne({
      where: { id: versionId, promptId },
    });
    if (!v) throw new NotFoundException('Version not found');
    return v;
  }
}
