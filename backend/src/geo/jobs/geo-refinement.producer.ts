import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface RouteRefinementJobData {
  cacheKey: string;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  mode: string;
}

export interface GeoRefinementJobData {
  type: 'geocode' | 'reverse-geocode';
  cacheKey: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export const GEO_REFINEMENT_QUEUE = 'geo-refinement';
export const ROUTE_REFINEMENT_QUEUE = 'route-refinement';

@Injectable()
export class GeoRefinementProducer {
  private readonly logger = new Logger(GeoRefinementProducer.name);

  constructor(
    @InjectQueue(GEO_REFINEMENT_QUEUE)
    private readonly geoQueue: Queue,
    @InjectQueue(ROUTE_REFINEMENT_QUEUE)
    private readonly routeQueue: Queue,
  ) {}

  async enqueueRouteRefinement(data: RouteRefinementJobData): Promise<void> {
    try {
      await this.routeQueue.add('refine-route', data, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 50,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue route refinement: ${(error as Error).message}`,
      );
    }
  }

  async enqueueGeoRefinement(data: GeoRefinementJobData): Promise<void> {
    try {
      await this.geoQueue.add('refine-geo', data, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 50,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue geo refinement: ${(error as Error).message}`,
      );
    }
  }
}
