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

interface PostcodesLookupResponse {
  status?: number;
  result?: {
    postcode?: string;
    latitude?: number;
    longitude?: number;
    admin_district?: string;
    region?: string;
    country?: string;
  };
}

interface PostcodesNearestResponse {
  status?: number;
  result?: Array<{
    postcode?: string;
    latitude?: number;
    longitude?: number;
    admin_district?: string;
    region?: string;
    country?: string;
  }>;
}

interface PostcodesAutocompleteResponse {
  status?: number;
  result?: string[] | null;
}

const UK_POSTCODE_REGEX = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i;
const API_TIMEOUT_MS = 2000;

const normalizePostcode = (value: string) =>
  value.toUpperCase().replace(/\s+/g, '');

const extractNormalizedPostcode = (value: string) => {
  const match = value.match(UK_POSTCODE_REGEX);
  return match ? normalizePostcode(match[0]) : null;
};

const buildFormattedLabel = (info: {
  postcode?: string;
  admin_district?: string;
  region?: string;
  country?: string;
}) => {
  const parts: string[] = [];
  if (info.postcode) {
    parts.push(info.postcode);
  }
  if (info.admin_district) {
    parts.push(info.admin_district);
  }
  if (info.region) {
    parts.push(info.region);
  }
  if (info.country) {
    parts.push(info.country);
  }
  return parts.join(', ');
};

@Injectable()
export class PostcodesIoGeocodeProvider implements GeocodeProvider {
  private readonly logger = new Logger(PostcodesIoGeocodeProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getName(): string {
    return 'postcodes.io';
  }

  private getBaseUrl(): string {
    const raw =
      this.configService.get<string>(
        'POSTCODES_IO_BASE_URL',
        'https://api.postcodes.io',
      ) || 'https://api.postcodes.io';
    return raw.replace(/\/+$/, '');
  }

  private async fetchPostcodeDetails(postcode: string) {
    const baseUrl = this.getBaseUrl();
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<PostcodesLookupResponse>(
            `${baseUrl}/postcodes/${encodeURIComponent(postcode)}`,
          )
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data;
      if (data.status !== 200 || !data.result) {
        return null;
      }
      return data.result;
    } catch (error) {
      this.logger.warn(
        `Postcodes.io lookup failed for ${postcode}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    const postcode = extractNormalizedPostcode(address);
    if (!postcode) {
      return null;
    }

    const result = await this.fetchPostcodeDetails(postcode);
    if (
      !result ||
      typeof result.latitude !== 'number' ||
      typeof result.longitude !== 'number'
    ) {
      return null;
    }

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: buildFormattedLabel(result),
      provider: this.getName(),
    };
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult | null> {
    const baseUrl = this.getBaseUrl();
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<PostcodesNearestResponse>(`${baseUrl}/postcodes`, {
            params: {
              lon: longitude,
              lat: latitude,
            },
          })
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data;
      const first = Array.isArray(data.result) ? data.result[0] : undefined;
      if (
        data.status !== 200 ||
        !first ||
        typeof first.latitude !== 'number' ||
        typeof first.longitude !== 'number'
      ) {
        return null;
      }

      return {
        latitude: first.latitude,
        longitude: first.longitude,
        formattedAddress: buildFormattedLabel(first),
        provider: this.getName(),
      };
    } catch (error) {
      this.logger.warn(
        `Postcodes.io reverse geocode failed: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async autocomplete(query: string): Promise<AutocompletePrediction[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const postcodeFromQuery = extractNormalizedPostcode(trimmed);
    const searchTerm = postcodeFromQuery || trimmed;
    const baseUrl = this.getBaseUrl();

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<PostcodesAutocompleteResponse>(
            `${baseUrl}/postcodes/${encodeURIComponent(
              searchTerm,
            )}/autocomplete`,
          )
          .pipe(timeout(API_TIMEOUT_MS)),
      );
      const data = response.data;
      const results = Array.isArray(data.result) ? data.result : [];
      if (!results.length) {
        return [];
      }

      const uniquePostcodes = Array.from(
        new Set(
          results
            .map((value) => value || '')
            .map((value) => extractNormalizedPostcode(value))
            .filter((value): value is string => !!value),
        ),
      ).slice(0, 10);

      const detailedResults = await Promise.all(
        uniquePostcodes.map((postcode) => this.fetchPostcodeDetails(postcode)),
      );

      const predictions: AutocompletePrediction[] = [];
      detailedResults.forEach((details) => {
        if (!details || !details.postcode) {
          return;
        }
        predictions.push({
          placeId: details.postcode,
          description: buildFormattedLabel(details),
          provider: this.getName(),
        });
      });

      return predictions;
    } catch (error) {
      this.logger.warn(
        `Postcodes.io autocomplete failed: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
