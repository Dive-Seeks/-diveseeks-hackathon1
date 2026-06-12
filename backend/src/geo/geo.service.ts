import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { RequestDedupService } from '../common/utils/request-dedup.service';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import {
  AutocompletePrediction,
  GeocodeProvider,
  GeocodeResult,
  ReverseGeocodeResult,
} from './interfaces/geocode-provider.interface';
import { GEO_FALLBACK_PROVIDERS, GEO_PRIMARY_PROVIDER } from './geo.tokens';

const GEOCODE_CACHE_TTL = 900;
const AUTOCOMPLETE_CACHE_TTL = 300;

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    @Inject(GEO_PRIMARY_PROVIDER)
    private readonly primaryProvider: GeocodeProvider,
    @Inject(GEO_FALLBACK_PROVIDERS)
    private readonly fallbackProviders: GeocodeProvider[],
    private readonly cacheService: RedisCacheService,
    private readonly dedupService: RequestDedupService,
  ) {}

  async geocodeAddress(dto: GeocodeAddressDto): Promise<GeocodeResult> {
    const start = performance.now();
    const normalizedAddress = dto.address.toLowerCase().trim();
    const cacheKey = `geo:geocode:${dto.tenantId}:${normalizedAddress}`;

    // 1. Cache-first
    const cached = await this.cacheService.get<GeocodeResult>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Geocode cache HIT [${cacheKey}] in ${(performance.now() - start).toFixed(1)}ms`,
      );
      return cached;
    }

    // 2. Deduplicated provider call — race providers with Promise.any
    return this.dedupService.dedup(cacheKey, async () => {
      const result = await this.raceProviders<GeocodeResult>((provider) =>
        provider.geocode(dto.address),
      );

      if (result) {
        await this.cacheService.set(cacheKey, result, GEOCODE_CACHE_TTL);
        this.logger.debug(
          `Geocode MISS resolved via ${result.provider} in ${(performance.now() - start).toFixed(1)}ms`,
        );
        return result;
      }

      throw new ServiceUnavailableException('No geocode provider available');
    });
  }

  async reverseGeocode(dto: ReverseGeocodeDto): Promise<ReverseGeocodeResult> {
    const start = performance.now();
    const cacheKey = `geo:reverse:${dto.latitude}:${dto.longitude}`;

    const cached = await this.cacheService.get<ReverseGeocodeResult>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Reverse geocode cache HIT in ${(performance.now() - start).toFixed(1)}ms`,
      );
      return cached;
    }

    return this.dedupService.dedup(cacheKey, async () => {
      const result = await this.raceProviders<ReverseGeocodeResult>(
        (provider) => provider.reverseGeocode(dto.latitude, dto.longitude),
      );

      if (result) {
        await this.cacheService.set(cacheKey, result, GEOCODE_CACHE_TTL);
        this.logger.debug(
          `Reverse geocode MISS resolved via ${result.provider} in ${(performance.now() - start).toFixed(1)}ms`,
        );
        return result;
      }

      throw new ServiceUnavailableException(
        'No reverse geocode provider available',
      );
    });
  }

  async autocomplete(
    dto: AutocompleteQueryDto,
  ): Promise<AutocompletePrediction[]> {
    const start = performance.now();
    const normalizedQuery = dto.query.toLowerCase().trim();
    const cacheKey = `geo:autocomplete:${normalizedQuery}`;

    const cached =
      await this.cacheService.get<AutocompletePrediction[]>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Autocomplete cache HIT in ${(performance.now() - start).toFixed(1)}ms`,
      );
      return cached;
    }

    return this.dedupService.dedup(cacheKey, async () => {
      const providers = [this.primaryProvider, ...this.fallbackProviders];
      const combined: AutocompletePrediction[] = [];
      const seen = new Set<string>();

      for (const provider of providers) {
        const result = await provider.autocomplete(dto.query);
        if (!result.length) {
          continue;
        }

        for (const prediction of result) {
          const key =
            `${prediction.placeId}|${prediction.description}`.toLowerCase();
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          combined.push(prediction);
        }
      }

      if (combined.length > 0) {
        await this.cacheService.set(cacheKey, combined, AUTOCOMPLETE_CACHE_TTL);
        this.logger.debug(
          `Autocomplete MISS resolved via ${providers
            .map((provider) => provider.getName())
            .join(', ')} in ${(performance.now() - start).toFixed(1)}ms`,
        );
        return combined;
      }

      return [];
    });
  }

  /**
   * Race all providers concurrently using Promise.any.
   * First successful result wins; all rejections fall through.
   */
  private async raceProviders<T extends { provider: string }>(
    callFn: (provider: GeocodeProvider) => Promise<T | null>,
  ): Promise<T | null> {
    const providers = [this.primaryProvider, ...this.fallbackProviders];

    const promises = providers.map(async (provider) => {
      const result = await callFn(provider);
      if (!result) {
        throw new Error(`${provider.getName()} returned null`);
      }
      return result;
    });

    try {
      return await Promise.any(promises);
    } catch {
      return null;
    }
  }
}
