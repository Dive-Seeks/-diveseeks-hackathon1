export type RouteMode = 'driving' | 'walking' | 'bicycling';

export interface RouteRequest {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  mode: RouteMode;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string | null;
  provider: string;
}

export interface RoutingProvider {
  getName(): string;
  getRoute(request: RouteRequest): Promise<RouteResult | null>;
}
