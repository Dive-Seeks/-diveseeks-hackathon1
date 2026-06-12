import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import {
  RouteResult,
  RoutingProvider,
} from '../interfaces/routing-provider.interface';
import {
  ROUTING_FALLBACK_PROVIDERS,
  ROUTING_PRIMARY_PROVIDER,
} from '../routing.tokens';
import {
  ROUTE_REFINEMENT_QUEUE,
  RouteRefinementJobData,
} from '../../geo/jobs/geo-refinement.producer';

const ROUTE_CACHE_TTL = 600;

@Processor(ROUTE_REFINEMENT_QUEUE)
export class RouteRefinementConsumer extends WorkerHost {
  private readonly logger = new Logger(RouteRefinementConsumer.name);

  constructor(
    @Inject(ROUTING_PRIMARY_PROVIDER)
    private readonly routingPrimary: RoutingProvider,
    @Inject(ROUTING_FALLBACK_PROVIDERS)
    private readonly routingFallbacks: RoutingProvider[],
    private readonly cacheService: RedisCacheService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const start = Date.now();
    try {
      await this.refineRoute(job.data as RouteRefinementJobData);
    } finally {
      this.logger.debug(
        `Route refinement job completed in ${Date.now() - start}ms`,
      );
    }
  }

  private async refineRoute(data: RouteRefinementJobData): Promise<void> {
    const providers = [this.routingPrimary, ...this.routingFallbacks];

    for (const provider of providers) {
      const route = await provider.getRoute({
        originLatitude: data.originLatitude,
        originLongitude: data.originLongitude,
        destinationLatitude: data.destinationLatitude,
        destinationLongitude: data.destinationLongitude,
        mode: data.mode as 'driving' | 'walking' | 'bicycling',
      });
      if (route) {
        await this.cacheService.set<RouteResult>(
          data.cacheKey,
          route,
          ROUTE_CACHE_TTL,
        );
        this.logger.log(
          `Route refined via ${provider.getName()} → ${data.cacheKey}`,
        );
        return;
      }
    }

    this.logger.warn(`Route refinement failed for key ${data.cacheKey}`);
  }
}
