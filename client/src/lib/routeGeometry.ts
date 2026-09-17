/** Maps stops onto the route polyline so the rail, the map and the bus agree. */
import { cumulativeDistances, projectOnLine, routeLength } from '@shared/geo';
import type { LineStringGeometry, Stop } from '@shared/types';

export interface RouteGeometry {
  total: number;
  /** 0..1 position of each stop along the polyline, by `seq`. */
  fractions: Record<number, number>;
}

export function computeRouteGeometry(polyline: LineStringGeometry, stops: Stop[]): RouteGeometry {
  const coords = polyline.coordinates;
  const cum = cumulativeDistances(coords);
  const total = routeLength(cum) || 1;
  const fractions: Record<number, number> = {};
  let previous = 0;
  for (const stop of [...stops].sort((a, b) => a.seq - b.seq)) {
    const projected = projectOnLine(coords, cum, [stop.lng, stop.lat]).distance / total;
    const value = Math.min(1, Math.max(previous, projected));
    fractions[stop.seq] = value;
    previous = value;
  }
  return { total, fractions };
}
