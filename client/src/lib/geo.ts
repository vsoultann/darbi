/** Client-side geo helpers — the maths itself is shared with the server. */
export { bearing, clamp, cumulativeDistances, haversine, pointAtDistance, projectOnLine, routeLength, shortestAngle } from '@shared/geo';

import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { LineStringGeometry, Position, Stop } from '@shared/types';

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function boundsOf(coordinates: Position[], padding = 0.004): Bounds {
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  for (const [lng, lat] of coordinates) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return { west: west - padding, south: south - padding, east: east + padding, north: north + padding };
}

export function toFeature(polyline: LineStringGeometry): Feature<LineString> {
  return { type: 'Feature', geometry: polyline, properties: {} };
}

export function stopsToFeatureCollection(
  stops: Stop[],
  currentSeq: number,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: stops.map((stop) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
      properties: {
        seq: stop.seq,
        passed: stop.seq <= currentSeq ? 1 : 0,
        name_en: stop.name_en,
        name_ar: stop.name_ar,
      },
    })),
  };
}
