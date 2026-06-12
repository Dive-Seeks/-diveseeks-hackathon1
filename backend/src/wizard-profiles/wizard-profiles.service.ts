import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WizardBusinessProfile } from './wizard-profiles.entity';

export interface ProfileUpsertDto {
  tenantId: string;
  siteId?: string | null;
  businessType?: string;
  cuisines?: string[];
  keywords?: string[];
  dietaryType?: string | null;
  spiceRange?: string | null;
  serviceModel?: string[];
  allergens?: string[];
  lastJourney?: string;
}

@Injectable()
export class WizardProfilesService {
  constructor(
    @InjectRepository(WizardBusinessProfile)
    private readonly repo: Repository<WizardBusinessProfile>,
  ) {}

  async findByTenantId(
    tenantId: string,
    siteId?: string | null,
  ): Promise<WizardBusinessProfile | null> {
    if (siteId) {
      return this.repo.findOne({ where: { tenantId, siteId } });
    }
    return this.repo.findOne({ where: { tenantId } });
  }

  async upsert(dto: ProfileUpsertDto): Promise<WizardBusinessProfile> {
    if (!dto.tenantId) throw new Error('tenantId is required');
    let profile = await this.findByTenantId(dto.tenantId, dto.siteId);
    if (!profile) {
      profile = this.repo.create({
        tenantId: dto.tenantId,
        siteId: dto.siteId || null,
        businessType: 'RESTAURANT',
        cuisines: [],
        keywords: [],
        dietaryType: null,
        spiceRange: null,
        serviceModel: [],
        allergens: [],
        completedJourneys: [],
        lastJourney: null,
      });
    }

    if (dto.businessType) profile.businessType = dto.businessType;
    if (dto.cuisines) profile.cuisines = dto.cuisines;
    if (dto.keywords) profile.keywords = dto.keywords;
    if (dto.dietaryType !== undefined) profile.dietaryType = dto.dietaryType;
    if (dto.spiceRange !== undefined) profile.spiceRange = dto.spiceRange;
    if (dto.serviceModel) profile.serviceModel = dto.serviceModel;
    if (dto.allergens) profile.allergens = dto.allergens;
    if (dto.lastJourney) {
      profile.lastJourney = dto.lastJourney;
      if (!profile.completedJourneys.includes(dto.lastJourney)) {
        profile.completedJourneys = [
          ...profile.completedJourneys,
          dto.lastJourney,
        ];
      }
    }

    return this.repo.save(profile);
  }
}
