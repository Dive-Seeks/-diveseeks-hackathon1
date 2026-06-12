import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import {
  GeocodeProvider,
  GeocodeResult,
  ReverseGeocodeResult,
} from '../interfaces/geocode-provider.interface';
import { GEO_FALLBACK_PROVIDERS, GEO_PRIMARY_PROVIDER } from '../geo.tokens';
import {
  GEO_REFINEMENT_QUEUE,
  GeoRefinementJobData,
} from './geo-refinement.producer';

const GEO_CACHE_TTL = 900;

@Processor(GEO_REFINEMENT_QUEUE)
export class GeoRefinementConsumer extends WorkerHost {
  private readonly logger = new Logger(GeoRefinementConsumer.name);

  constructor(
    @Inject(GEO_PRIMARY_PROVIDER)
    private readonly geoPrimary: GeocodeProvider,
    @Inject(GEO_FALLBACK_PROVIDERS)
    private readonly geoFallbacks: GeocodeProvider[],
    private readonly cacheService: RedisCacheService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const start = Date.now();
    try {
      await this.refineGeo(job.data as GeoRefinementJobData);
    } finally {
      this.logger.debug(
        `Geo refinement job completed in ${Date.now() - start}ms`,
      );
    }
  }

  private async refineGeo(data: GeoRefinementJobData): Promise<void> {
    const providers = [this.geoPrimary, ...this.geoFallbacks];

    if (data.type === 'geocode' && data.address) {
      for (const provider of providers) {
        const result = await provider.geocode(data.address);
        if (result) {
          await this.cacheService.set<GeocodeResult>(
            data.cacheKey,
            result,
            GEO_CACHE_TTL,
          );
          this.logger.log(
            `Geocode refined via ${provider.getName()} → ${data.cacheKey}`,
          );
          return;
        }
      }
    }

    if (
      data.type === 'reverse-geocode' &&
      typeof data.latitude === 'number' &&
      typeof data.longitude === 'number'
    ) {
      for (const provider of providers) {
        const result = await provider.reverseGeocode(
          data.latitude,
          data.longitude,
        );
        if (result) {
          await this.cacheService.set<ReverseGeocodeResult>(
            data.cacheKey,
            result,
            GEO_CACHE_TTL,
          );
          this.logger.log(
            `Reverse geocode refined via ${provider.getName()} → ${data.cacheKey}`,
          );
          return;
        }
      }
    }
  }
}
