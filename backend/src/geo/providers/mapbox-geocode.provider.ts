import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import {
  AutocompletePrediction,
  GeocodeProvider,
  GeocodeResult,
  ReverseGeocodeResult,
} from '../interfaces/geocode-provider.interface';

interface MapboxFeature {
  id?: string;
  center?: number[];
  place_name?: string;
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[];
}

const UK_POSTCODE_REGEX = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i;
const API_TIMEOUT_MS = 2000;

const normalizePostcode = (value: string) =>
  value.toUpperCase().replace(/\s+/g, '');

const extractNormalizedPostcode = (value: string) => {
  const match = value.match(UK_POSTCODE_REGEX);
  return match ? normalizePostcode(match[0]) : null;
};

@Injectable()
export class MapboxGeocodeProvider implements GeocodeProvider {
  private readonly logger = new Logger(MapboxGeocodeProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getName(): string {
    return 'mapbox';
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    const token = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              address,
            )}.json`,
            {
              params: {
                access_token: token,
                limit: 1,
              },
            },
          )
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as MapboxGeocodeResponse;
      if (!data.features?.length) {
        return null;
      }

      const first = data.features[0];
      if (
        !Array.isArray(first.center) ||
        first.center.length < 2 ||
        typeof first.center[0] !== 'number' ||
        typeof first.center[1] !== 'number' ||
        typeof first.place_name !== 'string'
      ) {
        return null;
      }
      return {
        latitude: first.center[1],
        longitude: first.center[0],
        formattedAddress: first.place_name,
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(`Mapbox geocode failed: ${(error as Error).message}`);
      return null;
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult | null> {
    const token = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
            {
              params: {
                access_token: token,
                limit: 1,
              },
            },
          )
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as MapboxGeocodeResponse;

      if (!data.features?.length) {
        return null;
      }
      const placeName = data.features[0].place_name;
      if (typeof placeName !== 'string') {
        return null;
      }
      return {
        latitude,
        longitude,
        formattedAddress: placeName,
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(
        `Mapbox reverse geocode failed: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async autocomplete(query: string): Promise<AutocompletePrediction[]> {
    const token = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      return [];
    }

    try {
      const isPostcodeSearch = !!extractNormalizedPostcode(query);
      const effectiveQuery = isPostcodeSearch
        ? `businesses in ${query}`
        : query;
      const response = await firstValueFrom(
        this.httpService
          .get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              effectiveQuery,
            )}.json`,
            {
              params: {
                access_token: token,
                autocomplete: true,
                limit: 5,
                ...(isPostcodeSearch ? { types: 'poi,address' } : {}),
              },
            },
          )
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as MapboxGeocodeResponse;

      if (!data.features?.length) {
        return [];
      }

      const mapped = data.features
        .filter(
          (feature) =>
            typeof feature.id === 'string' &&
            typeof feature.place_name === 'string',
        )
        .map((feature) => ({
          placeId: feature.id as string,
          description: feature.place_name as string,
          provider: this.getName(),
        }));

      if (!isPostcodeSearch) {
        return mapped;
      }

      const postcode = extractNormalizedPostcode(query);
      if (!postcode) {
        return [];
      }
      return mapped.filter((item) => {
        const itemPostcode = extractNormalizedPostcode(item.description);
        return itemPostcode === postcode;
      });
    } catch (error) {
      this.logger.warn(
        `Mapbox autocomplete failed: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
