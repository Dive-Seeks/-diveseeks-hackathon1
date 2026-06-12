export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  provider: string;
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  provider: string;
}

export interface AutocompletePrediction {
  placeId: string;
  description: string;
  provider: string;
}

export interface GeocodeProvider {
  getName(): string;
  geocode(address: string): Promise<GeocodeResult | null>;
  reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult | null>;
  autocomplete(query: string): Promise<AutocompletePrediction[]>;
}
