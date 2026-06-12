import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSpecialistConfig } from './entities/tenant-specialist-config.entity';

@Injectable()
export class TenantSpecialistConfigService {
  private readonly logger = new Logger(TenantSpecialistConfigService.name);

  constructor(
    @InjectRepository(TenantSpecialistConfig)
    private readonly repo: Repository<TenantSpecialistConfig>,
  ) {}

  async getAll(tenantId: string): Promise<TenantSpecialistConfig[]> {
    return this.repo.find({
      where: { tenantId },
      select: [
        'id',
        'tenantId',
        'specialistId',
        'blocked',
        'routingBoost',
        'promptAppend',
        'dailyTokenCap',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async getOne(
    tenantId: string,
    specialistId: string,
  ): Promise<TenantSpecialistConfig | null> {
    return this.repo.findOne({
      where: { tenantId, specialistId },
      select: [
        'id',
        'tenantId',
        'specialistId',
        'blocked',
        'routingBoost',
        'promptAppend',
        'dailyTokenCap',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async upsert(
    tenantId: string,
    specialistId: string,
    dto: {
      blocked?: boolean;
      routingBoost?: number;
      promptAppend?: string;
      dailyTokenCap?: number;
    },
  ): Promise<TenantSpecialistConfig> {
    let config = await this.repo.findOne({ where: { tenantId, specialistId } });
    if (!config) {
      config = this.repo.create({ tenantId, specialistId });
    }
    if (dto.blocked !== undefined) config.blocked = dto.blocked;
    if (dto.routingBoost !== undefined) config.routingBoost = dto.routingBoost;
    if (dto.promptAppend !== undefined) config.promptAppend = dto.promptAppend;
    if (dto.dailyTokenCap !== undefined)
      config.dailyTokenCap = dto.dailyTokenCap;
    const saved = await this.repo.save(config);
    this.logger.log(
      `[TenantSpecialistConfig] Upserted config for tenant=${tenantId} specialist=${specialistId} blocked=${config.blocked} boost=${config.routingBoost}`,
    );
    return saved;
  }
}
