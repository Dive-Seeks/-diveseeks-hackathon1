import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { RequestDedupService } from '../common/utils/request-dedup.service';
import { haversineRoute, normalizeCoord } from '../common/utils/haversine.util';
import { RouteRequestDto } from './dto/route-request.dto';
import {
  RouteResult,
  RoutingProvider,
} from './interfaces/routing-provider.interface';
import {
  ROUTING_FALLBACK_PROVIDERS,
  ROUTING_PRIMARY_PROVIDER,
} from './routing.tokens';
import { GeoRefinementProducer } from '../geo/jobs/geo-refinement.producer';

const ROUTE_CACHE_TTL = 600;
const SHORT_DISTANCE_THRESHOLD_METERS = 200;

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    @Inject(ROUTING_PRIMARY_PROVIDER)
    private readonly primaryProvider: RoutingProvider,
    @Inject(ROUTING_FALLBACK_PROVIDERS)
    private readonly fallbackProviders: RoutingProvider[],
    private readonly cacheService: RedisCacheService,
    private readonly dedupService: RequestDedupService,
    private readonly refinementProducer: GeoRefinementProducer,
  ) {}

  async calculateRoute(dto: RouteRequestDto): Promise<RouteResult> {
    const start = performance.now();
    const mode = dto.mode ?? 'driving';

    const oLat = normalizeCoord(dto.originLatitude);
    const oLon = normalizeCoord(dto.originLongitude);
    const dLat = normalizeCoord(dto.destinationLatitude);
    const dLon = normalizeCoord(dto.destinationLongitude);

    const cacheKey = `route:${oLat}:${oLon}:${dLat}:${dLon}:${mode}`;

    // 1. Cache-first
    const cached = await this.cacheService.get<RouteResult>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Route cache HIT [${cacheKey}] in ${(performance.now() - start).toFixed(1)}ms`,
      );
      return cached;
    }

    // 2. Haversine fallback (instant)
    const { distanceMeters, durationSeconds } = haversineRoute(
      oLat,
      oLon,
      dLat,
      dLon,
      mode,
    );

    const fallbackResult: RouteResult = {
      distanceMeters,
      durationSeconds,
      polyline: null,
      provider: 'haversine',
    };

    // 3. Short-circuit: tiny distances never need external API
    if (distanceMeters < SHORT_DISTANCE_THRESHOLD_METERS) {
      await this.cacheService.set(cacheKey, fallbackResult, ROUTE_CACHE_TTL);
      this.logger.debug(
        `Route SHORT-CIRCUIT [${distanceMeters}m] in ${(performance.now() - start).toFixed(1)}ms`,
      );
      return fallbackResult;
    }

    // 4. Cache the Haversine result immediately so subsequent requests hit cache
    await this.cacheService.set(cacheKey, fallbackResult, ROUTE_CACHE_TTL);

    this.logger.debug(
      `Route FALLBACK returned in ${(performance.now() - start).toFixed(1)}ms — async refinement enqueued`,
    );

    // 5. Enqueue async background refinement via BullMQ (non-blocking)
    void this.refinementProducer.enqueueRouteRefinement({
      cacheKey,
      originLatitude: oLat,
      originLongitude: oLon,
      destinationLatitude: dLat,
      destinationLongitude: dLon,
      mode,
    });

    return fallbackResult;
  }

  /**
   * Synchronous route calculation — waits for external API.
   * Use only when caller explicitly needs accurate data (e.g. background jobs).
   */
  async calculateRouteSync(dto: RouteRequestDto): Promise<RouteResult> {
    const mode = dto.mode ?? 'driving';
    const oLat = normalizeCoord(dto.originLatitude);
    const oLon = normalizeCoord(dto.originLongitude);
    const dLat = normalizeCoord(dto.destinationLatitude);
    const dLon = normalizeCoord(dto.destinationLongitude);
    const cacheKey = `route:${oLat}:${oLon}:${dLat}:${dLon}:${mode}`;

    const cached = await this.cacheService.get<RouteResult>(cacheKey);
    if (cached) {
      return cached;
    }

    return this.dedupService.dedup(cacheKey, async () => {
      const providers = [this.primaryProvider, ...this.fallbackProviders];
      for (const provider of providers) {
        const route = await provider.getRoute({
          originLatitude: oLat,
          originLongitude: oLon,
          destinationLatitude: dLat,
          destinationLongitude: dLon,
          mode: mode,
        });
        if (route) {
          await this.cacheService.set(cacheKey, route, ROUTE_CACHE_TTL);
          return route;
        }
      }

      // Final fallback: Haversine
      const { distanceMeters, durationSeconds } = haversineRoute(
        oLat,
        oLon,
        dLat,
        dLon,
        mode,
      );
      const fallback: RouteResult = {
        distanceMeters,
        durationSeconds,
        polyline: null,
        provider: 'haversine',
      };
      await this.cacheService.set(cacheKey, fallback, ROUTE_CACHE_TTL);
      return fallback;
    });
  }
}
