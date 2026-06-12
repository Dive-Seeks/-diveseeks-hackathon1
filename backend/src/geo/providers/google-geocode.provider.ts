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

interface GoogleGeocodeApiResponse {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
}

interface GoogleAutocompleteApiResponse {
  status?: string;
  predictions?: Array<{
    place_id?: string;
    description?: string;
  }>;
}

interface GoogleTextSearchApiResponse {
  status?: string;
  results?: Array<{
    place_id?: string;
    name?: string;
    formatted_address?: string;
  }>;
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
export class GoogleGeocodeProvider implements GeocodeProvider {
  private readonly logger = new Logger(GoogleGeocodeProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getName(): string {
    return 'google';
  }

  private async searchBusinessesByPostcode(
    query: string,
    apiKey: string,
  ): Promise<AutocompletePrediction[]> {
    const postcode = extractNormalizedPostcode(query);
    if (!postcode) {
      return [];
    }

    const response = await firstValueFrom(
      this.httpService
        .get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params: {
            query: `businesses in ${query}`,
            key: apiKey,
          },
        })
        .pipe(timeout(API_TIMEOUT_MS)),
    );

    const data = response.data as GoogleTextSearchApiResponse;
    if (data.status !== 'OK' || !data.results?.length) {
      return [];
    }

    return data.results
      .filter(
        (result) =>
          typeof result.place_id === 'string' &&
          typeof result.name === 'string' &&
          typeof result.formatted_address === 'string',
      )
      .map((result) => ({
        placeId: result.place_id as string,
        description: `${result.name as string}, ${result.formatted_address as string}`,
        provider: this.getName(),
      }))
      .filter((item) => {
        const itemPostcode = extractNormalizedPostcode(item.description);
        return itemPostcode === postcode;
      });
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              address,
              key: apiKey,
            },
          })
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as GoogleGeocodeApiResponse;
      if (data.status !== 'OK' || !data.results?.length) {
        return null;
      }

      const first = data.results[0];
      const latitude = first.geometry?.location?.lat;
      const longitude = first.geometry?.location?.lng;
      const formattedAddress = first.formatted_address;
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        typeof formattedAddress !== 'string'
      ) {
        return null;
      }
      return {
        latitude,
        longitude,
        formattedAddress,
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(`Google geocode failed: ${(error as Error).message}`);
      return null;
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult | null> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              latlng: `${latitude},${longitude}`,
              key: apiKey,
            },
          })
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as GoogleGeocodeApiResponse;
      if (data.status !== 'OK' || !data.results?.length) {
        return null;
      }
      const formattedAddress = data.results[0].formatted_address;
      if (typeof formattedAddress !== 'string') {
        return null;
      }
      return {
        latitude,
        longitude,
        formattedAddress,
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(
        `Google reverse geocode failed: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async autocomplete(query: string): Promise<AutocompletePrediction[]> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return [];
    }

    try {
      const postcodeMatches = extractNormalizedPostcode(query);
      if (postcodeMatches) {
        const businessResults = await this.searchBusinessesByPostcode(
          query,
          apiKey,
        );
        if (businessResults.length > 0) {
          return businessResults.slice(0, 10);
        }
        return [];
      }

      const response = await firstValueFrom(
        this.httpService
          .get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              address: query,
              components: 'country:uk',
              key: apiKey,
            },
          })
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data as GoogleGeocodeApiResponse;
      if (data.status !== 'OK' || !data.results?.length) {
        return [];
      }

      return data.results
        .filter((result) => typeof result.formatted_address === 'string')
        .map((result) => ({
          placeId: result.formatted_address as string,
          description: result.formatted_address as string,
          provider: this.getName(),
        }));
    } catch (error) {
      this.logger.warn(
        `Google autocomplete failed: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
