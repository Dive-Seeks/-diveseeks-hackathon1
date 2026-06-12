const EARTH_RADIUS_METERS = 6_371_000;
const AVERAGE_SPEED_MS: Record<string, number> = {
  driving: 11.11, // ~40 km/h urban average
  walking: 1.39, // ~5 km/h
  bicycling: 4.17, // ~15 km/h
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  mode: string = 'driving',
) {
  const straightLine = haversineDistanceMeters(
    originLat,
    originLon,
    destLat,
    destLon,
  );
  // Road distance ≈ 1.3x straight line (Manhattan-like detour factor)
  const distanceMeters = Math.round(straightLine * 1.3);
  const speed = AVERAGE_SPEED_MS[mode] ?? AVERAGE_SPEED_MS.driving;
  const durationSeconds = Math.round(distanceMeters / speed);

  return { distanceMeters, durationSeconds };
}

export function normalizeCoord(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
