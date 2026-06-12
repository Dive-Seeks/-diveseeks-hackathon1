import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import * as http from 'http';
import * as https from 'https';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GoogleGeocodeProvider } from './providers/google-geocode.provider';
import { MapboxGeocodeProvider } from './providers/mapbox-geocode.provider';
import { PostcodesIoGeocodeProvider } from './providers/postcodes-io-geocode.provider';
import { GEO_FALLBACK_PROVIDERS, GEO_PRIMARY_PROVIDER } from './geo.tokens';
import {
  GEO_REFINEMENT_QUEUE,
  ROUTE_REFINEMENT_QUEUE,
  GeoRefinementProducer,
} from './jobs/geo-refinement.producer';
import { GeoRefinementConsumer } from './jobs/geo-refinement.consumer';

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
    BullModule.registerQueue(
      { name: GEO_REFINEMENT_QUEUE },
      { name: ROUTE_REFINEMENT_QUEUE },
    ),
  ],
  controllers: [GeoController],
  providers: [
    GeoService,
    GoogleGeocodeProvider,
    MapboxGeocodeProvider,
    PostcodesIoGeocodeProvider,
    GeoRefinementProducer,
    GeoRefinementConsumer,
    {
      provide: GEO_PRIMARY_PROVIDER,
      inject: [
        ConfigService,
        GoogleGeocodeProvider,
        MapboxGeocodeProvider,
        PostcodesIoGeocodeProvider,
      ],
      useFactory: (
        configService: ConfigService,
        googleProvider: GoogleGeocodeProvider,
        mapboxProvider: MapboxGeocodeProvider,
        postcodesProvider: PostcodesIoGeocodeProvider,
      ) => {
        const strategy = configService.get<string>('GEO_PROVIDER', 'postcodes');
        if (strategy === 'google') {
          return googleProvider;
        }
        if (strategy === 'mapbox') {
          return mapboxProvider;
        }
        return postcodesProvider;
      },
    },
    {
      provide: GEO_FALLBACK_PROVIDERS,
      inject: [
        ConfigService,
        GoogleGeocodeProvider,
        MapboxGeocodeProvider,
        PostcodesIoGeocodeProvider,
      ],
      useFactory: (
        configService: ConfigService,
        googleProvider: GoogleGeocodeProvider,
        mapboxProvider: MapboxGeocodeProvider,
        postcodesProvider: PostcodesIoGeocodeProvider,
      ) => {
        const strategy = configService.get<string>('GEO_PROVIDER', 'postcodes');
        if (strategy === 'google') {
          return [mapboxProvider, postcodesProvider];
        }
        if (strategy === 'mapbox') {
          return [googleProvider, postcodesProvider];
        }
        return [googleProvider, mapboxProvider];
      },
    },
  ],
  exports: [
    GeoService,
    GEO_PRIMARY_PROVIDER,
    GEO_FALLBACK_PROVIDERS,
    GeoRefinementProducer,
  ],
})
export class GeoModule {}
