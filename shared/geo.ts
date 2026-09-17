/**
 * Geodesy helpers. Deliberately dependency-free so the server ticker and the
 * client-side DemoEngine run *exactly* the same maths.
 */
import type { Position } from './types';

const EARTH_RADIUS_M = 6371008.8;
const DEG = Math.PI / 180;

export function toRadians(deg: number): number {
  return deg * DEG;
}

export function haversine(a: Position, b: Position): number {
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLat = lat2 - lat1;
  const dLng = toRadians(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cumulative metres at each vertex; `cum[0] === 0`, `cum.at(-1)` is the total length. */
export function cumulativeDistances(coords: Position[]): number[] {
  const cum = new Array<number>(coords.length);
  cum[0] = 0;
  for (let i = 1; i < coords.length; i += 1) {
    cum[i] = cum[i - 1] + haversine(coords[i - 1], coords[i]);
  }
  return cum;
}

export function routeLength(cum: number[]): number {
  return cum.length ? cum[cum.length - 1] : 0;
}

/** Degrees clockwise from north. */
export function bearing(a: Position, b: Position): number {
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLng = toRadians(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

export interface PointOnLine {
  position: Position;
  heading: number;
  /** Index of the vertex that starts the segment the point sits on. */
  index: number;
}

/** Interpolate a point `metres` along the polyline. */
export function pointAtDistance(coords: Position[], cum: number[], metres: number): PointOnLine {
  if (coords.length === 0) return { position: [0, 0], heading: 0, index: 0 };
  if (coords.length === 1) return { position: coords[0], heading: 0, index: 0 };

  const total = routeLength(cum);
  const d = Math.max(0, Math.min(total, metres));

  // Binary search for the segment containing `d`.
  let lo = 0;
  let hi = coords.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }

  const a = coords[lo];
  const b = coords[hi];
  const segLen = cum[hi] - cum[lo];
  const t = segLen > 0 ? (d - cum[lo]) / segLen : 0;
  return {
    position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    heading: bearing(a, b),
    index: lo,
  };
}

export interface Projection {
  /** Metres along the polyline of the closest point. */
  distance: number;
  position: Position;
  /** Perpendicular offset in metres. */
  offset: number;
}

/**
 * Snap an arbitrary point (a stop) onto the route polyline, so stops and the bus
 * share one coordinate system: "metres travelled".
 */
export function projectOnLine(coords: Position[], cum: number[], point: Position): Projection {
  let best: Projection = { distance: 0, position: coords[0] ?? point, offset: Number.POSITIVE_INFINITY };

  for (let i = 0; i < coords.length - 1; i += 1) {
    const a = coords[i];
    const b = coords[i + 1];
    // Local equirectangular projection — segments are short, this is accurate to cm here.
    const latRef = toRadians((a[1] + b[1]) / 2);
    const kx = Math.cos(latRef) * 111320;
    const ky = 110540;
    const bx = (b[0] - a[0]) * kx;
    const by = (b[1] - a[1]) * ky;
    const px = (point[0] - a[0]) * kx;
    const py = (point[1] - a[1]) * ky;
    const len2 = bx * bx + by * by;
    let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = t * bx;
    const cy = t * by;
    const offset = Math.hypot(px - cx, py - cy);
    if (offset < best.offset) {
      best = {
        offset,
        distance: cum[i] + t * (cum[i + 1] - cum[i]),
        position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
      };
    }
  }
  return best;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Shortest signed difference between two bearings, for smooth marker rotation. */
export function shortestAngle(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}
