import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialistModelOverride } from './entities/specialist-model-override.entity';

export interface ModelResolution {
  provider: string;
  model: string;
  source: 'override' | 'default';
}

const DEFAULT_MODEL: ModelResolution = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  source: 'default',
};

@Injectable()
export class SpecialistModelRouterService {
  constructor(
    @InjectRepository(SpecialistModelOverride)
    private readonly overrideRepo: Repository<SpecialistModelOverride>,
  ) {}

  async resolveModel(
    tenantId: string,
    specialistId: string,
  ): Promise<ModelResolution> {
    const override = await this.overrideRepo.findOne({
      where: { tenantId, specialistId },
    });
    if (!override) return DEFAULT_MODEL;
    return {
      provider: override.provider,
      model: override.model,
      source: 'override',
    };
  }
}
