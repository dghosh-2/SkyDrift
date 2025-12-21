import * as turf from '@turf/turf';

/**
 * Check if a point is inside a polygon
 */
export function pointInPolygon(
  lat: number,
  lng: number,
  polygon: number[][]
): boolean {
  if (polygon.length < 3) return false;
  
  const point = turf.point([lng, lat]);
  const poly = turf.polygon([polygon.map(([lng, lat]) => [lng, lat])]);
  
  return turf.booleanPointInPolygon(point, poly);
}

/**
 * Create a smooth bezier curve through points
 */
export function createSmoothPath(
  positions: { lat: number; lng: number }[]
): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (positions.length < 2) return null;

  const coordinates = positions.map((p) => [p.lng, p.lat]);
  const line = turf.lineString(coordinates);
  
  // Create a bezier spline for smooth curves
  try {
    const curved = turf.bezierSpline(line, { resolution: 10000, sharpness: 0.85 });
    return curved;
  } catch {
    return line;
  }
}

/**
 * Calculate distance between two points in km
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}

/**
 * Get wind speed color based on speed in m/s
 */
export function getWindColor(speed: number): string {
  if (speed < 2) return '#a8e6cf';      // Light green - calm
  if (speed < 5) return '#88d8b0';      // Green - light
  if (speed < 10) return '#ffeaa7';     // Yellow - moderate
  if (speed < 15) return '#fdcb6e';     // Orange - fresh
  if (speed < 20) return '#e17055';     // Red-orange - strong
  return '#d63031';                      // Red - very strong
}

/**
 * Format wind direction as compass direction
 */
export function windDirectionToCompass(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

