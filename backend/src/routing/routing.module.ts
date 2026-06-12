import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import * as http from 'http';
import * as https from 'https';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { HereRoutingProvider } from './providers/here-routing.provider';
import { MapboxRoutingProvider } from './providers/mapbox-routing.provider';
import {
  ROUTING_FALLBACK_PROVIDERS,
  ROUTING_PRIMARY_PROVIDER,
} from './routing.tokens';
import { RouteRefinementConsumer } from './jobs/route-refinement.consumer';
import { GeoModule } from '../geo/geo.module';
import { ROUTE_REFINEMENT_QUEUE } from '../geo/jobs/geo-refinement.producer';

const keepAliveHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
});
const keepAliveHttpAgent = new http.Agent({ keepAlive: true, maxSockets: 25 });

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
      httpAgent: keepAliveHttpAgent,
      httpsAgent: keepAliveHttpsAgent,
    }),
    BullModule.registerQueue({ name: ROUTE_REFINEMENT_QUEUE }),
    GeoModule,
  ],
  controllers: [RoutingController],
  providers: [
    RoutingService,
    HereRoutingProvider,
    MapboxRoutingProvider,
    RouteRefinementConsumer,
    {
      provide: ROUTING_PRIMARY_PROVIDER,
      inject: [ConfigService, HereRoutingProvider, MapboxRoutingProvider],
      useFactory: (
        configService: ConfigService,
        hereProvider: HereRoutingProvider,
        mapboxProvider: MapboxRoutingProvider,
      ) => {
        const strategy = configService.get<string>('ROUTING_PROVIDER', 'here');
        return strategy === 'mapbox' ? mapboxProvider : hereProvider;
      },
    },
    {
      provide: ROUTING_FALLBACK_PROVIDERS,
      inject: [ConfigService, HereRoutingProvider, MapboxRoutingProvider],
      useFactory: (
        configService: ConfigService,
        hereProvider: HereRoutingProvider,
        mapboxProvider: MapboxRoutingProvider,
      ) => {
        const strategy = configService.get<string>('ROUTING_PROVIDER', 'here');
        return strategy === 'mapbox' ? [hereProvider] : [mapboxProvider];
      },
    },
  ],
  exports: [RoutingService],
})
export class RoutingModule {}
