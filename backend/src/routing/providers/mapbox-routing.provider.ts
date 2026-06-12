import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import {
  RouteRequest,
  RouteResult,
  RoutingProvider,
} from '../interfaces/routing-provider.interface';

interface MapboxRoute {
  distance?: number;
  duration?: number;
  geometry?: string;
}

interface MapboxRoutingResponse {
  routes?: MapboxRoute[];
}

const API_TIMEOUT_MS = 2000;

@Injectable()
export class MapboxRoutingProvider implements RoutingProvider {
  private readonly logger = new Logger(MapboxRoutingProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getName(): string {
    return 'mapbox';
  }

  async getRoute(request: RouteRequest): Promise<RouteResult | null> {
    const token = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      return null;
    }

    try {
      const profile = request.mode === 'walking' ? 'walking' : 'driving';
      const coordinates = `${request.originLongitude},${request.originLatitude};${request.destinationLongitude},${request.destinationLatitude}`;
      const response = await firstValueFrom(
        this.httpService
          .get(
            `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`,
            {
              params: {
                geometries: 'polyline',
                overview: 'full',
                access_token: token,
              },
            },
          )
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as MapboxRoutingResponse;

      const route = data.routes?.[0];
      if (!route) {
        return null;
      }
      if (
        typeof route.distance !== 'number' ||
        typeof route.duration !== 'number'
      ) {
        return null;
      }

      return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        polyline: route.geometry ?? null,
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(`Mapbox routing failed: ${(error as Error).message}`);
      return null;
    }
  }
}
