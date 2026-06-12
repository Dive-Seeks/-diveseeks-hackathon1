import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialistPromptVersion } from './entities/specialist-prompt-version.entity';
import { RedisCacheService } from '../common/cache/redis-cache.service';

import { SPECIALIST_DEFAULT_PROMPTS } from '../agents/constants/specialist-prompts';

@Injectable()
export class PromptVersionService {
  private readonly logger = new Logger(PromptVersionService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(SpecialistPromptVersion)
    private readonly repo: Repository<SpecialistPromptVersion>,
    private readonly cache: RedisCacheService,
  ) {}

  async getActivePrompt(
    specialistId: string,
  ): Promise<SpecialistPromptVersion | null> {
    const cacheKey = `evolve:prompt:${specialistId}:active`;

    // Check cache
    const cached = await this.cache.get<SpecialistPromptVersion>(cacheKey);
    if (cached) return cached;

    // Check DB
    const version = await this.repo.findOne({
      where: { specialistId, isActive: true },
      order: { version: 'DESC' },
    });

    if (version) {
      await this.cache.set(cacheKey, version, this.CACHE_TTL);
    }

    return version;
  }

  async invalidateCache(specialistId: string): Promise<void> {
    const cacheKey = `evolve:prompt:${specialistId}:active`;
    await this.cache.del(cacheKey);
    this.logger.log(`Invalidated prompt cache for ${specialistId}`);
  }

  async seedV1PromptVersions(): Promise<void> {
    for (const [specialistId, systemPrompt] of Object.entries(
      SPECIALIST_DEFAULT_PROMPTS,
    )) {
      const existing = await this.repo.findOne({
        where: { specialistId, version: 1 },
      });
      if (existing) continue;

      try {
        await this.repo.save({
          specialistId,
          version: 1,
          systemPrompt,
          isActive: true,
          status: 'accepted',
          diagnosis: 'INITIAL_SEED',
          changeDescription: 'Hardcoded v1 prompt — system seed',
          acceptedAt: new Date(),
          parentVersionId: null,
          sourceTrajectoryIds: [],
        });
        this.logger.log(`[PromptVersion] Seeded v1 for ${specialistId}`);
      } catch (e: any) {
        if (e?.code === '23505') continue; // concurrent boot race — row already inserted
        throw e;
      }
    }
  }
}
