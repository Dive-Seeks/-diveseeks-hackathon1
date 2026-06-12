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

interface HereRouteSummary {
  length?: number;
  duration?: number;
}

interface HereRouteSection {
  summary?: HereRouteSummary;
  polyline?: string;
}

interface HereRoute {
  sections?: HereRouteSection[];
}

interface HereRoutingResponse {
  routes?: HereRoute[];
}

const API_TIMEOUT_MS = 2000;

@Injectable()
export class HereRoutingProvider implements RoutingProvider {
  private readonly logger = new Logger(HereRoutingProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getName(): string {
    return 'here';
  }

  async getRoute(request: RouteRequest): Promise<RouteResult | null> {
    const apiKey = this.configService.get<string>('HERE_API_KEY');
    if (!apiKey) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get('https://router.hereapi.com/v8/routes', {
            params: {
              transportMode: request.mode,
              origin: `${request.originLatitude},${request.originLongitude}`,
              destination: `${request.destinationLatitude},${request.destinationLongitude}`,
              return: 'summary,polyline',
              apikey: apiKey,
            },
          })
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as HereRoutingResponse;

      const route = data.routes?.[0];
      const section = route?.sections?.[0];
      const distanceMeters = section?.summary?.length;
      const durationSeconds = section?.summary?.duration;
      if (
        typeof distanceMeters !== 'number' ||
        typeof durationSeconds !== 'number'
      ) {
        return null;
      }

      return {
        distanceMeters,
        durationSeconds,
        polyline: section?.polyline ?? null,
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(`HERE routing failed: ${(error as Error).message}`);
      return null;
    }
  }
}
