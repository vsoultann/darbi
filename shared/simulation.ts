/**
 * TripSimulator — the authoritative motion model.
 *
 * The server runs one of these per active trip at 4 Hz (§8.3) and the client-side
 * DemoEngine runs the identical class in the browser, which is why a `trip:update`
 * from the socket and one from Demo Mode are indistinguishable to the UI.
 *
 * Time model: `speedMultiplier` compresses *wall clock*, not the countdown. ETA is
 * always reported in nominal seconds (what a real parent would see) so a 5x demo
 * simply makes those seconds elapse five times faster.
 */
import { clamp, cumulativeDistances, pointAtDistance, projectOnLine, routeLength } from './geo';
import type { Position, TripState, TripUpdate } from './types';

export const DEFAULT_SPEED_KMH = 34;
/** ETA below which a trip flips to `approaching` (§6.3.6). */
export const APPROACHING_ETA_SECONDS = 180;
/** Hysteresis so a wobbling ETA cannot strobe the accent colour. */
const LEAVE_APPROACHING_ETA_SECONDS = 210;
/** How much a `delayed` bus crawls compared to nominal. */
const DELAY_CRAWL_FACTOR = 0.22;

export interface SimStop {
  seq: number;
  lat: number;
  lng: number;
  dwell_seconds: number;
  /** Metres along the route polyline. */
  distance: number;
}

export type SimEvent =
  | { type: 'started' }
  | { type: 'reset' }
  | { type: 'stop_reached'; seq: number }
  | { type: 'state'; state: TripState; previous: TripState }
  | { type: 'arrived' };

export interface SimulatorInit {
  tripId: string;
  busId: string;
  routeId: string;
  coordinates: Position[];
  stops: Array<{ seq: number; lat: number; lng: number; dwell_seconds: number }>;
  /** The stop the watcher cares about. Defaults to the last stop (the school). */
  targetStopSeq?: number;
  baseSpeedKmh?: number;
  simulated?: boolean;
  /** Afternoon drop-off: drive the polyline school -> home, renumbering stops. */
  reverse?: boolean;
}

export class TripSimulator {
  readonly tripId: string;
  readonly busId: string;
  readonly routeId: string;
  readonly stops: SimStop[];
  readonly totalDistance: number;

  private readonly coords: Position[];
  private readonly cum: number[];
  private readonly simulated: boolean;
  readonly reversed: boolean;

  baseSpeedKmh: number;
  targetStopSeq: number;

  /** Metres driven along the polyline. */
  distance = 0;
  state: TripState = 'idle';
  speedMultiplier = 1;
  delaySeconds = 0;
  dwellRemaining = 0;
  paused = false;
  currentStopSeq = 0;

  private nextStopIndex = 0;
  private pendingEvents: SimEvent[] = [];

  constructor(init: SimulatorInit) {
    this.tripId = init.tripId;
    this.busId = init.busId;
    this.routeId = init.routeId;
    const maxSeq = init.stops.reduce((m, s) => Math.max(m, s.seq), 0);
    const reverse = init.reverse ?? false;
    this.reversed = reverse;
    this.coords = reverse ? [...init.coordinates].reverse() : init.coordinates;
    this.cum = cumulativeDistances(init.coordinates);
    this.totalDistance = routeLength(this.cum);
    this.baseSpeedKmh = init.baseSpeedKmh ?? DEFAULT_SPEED_KMH;
    this.simulated = init.simulated ?? false;

    const sourceStops = reverse
      ? init.stops.map((s) => ({ ...s, seq: maxSeq - s.seq }))
      : init.stops;
    this.stops = [...sourceStops]
      .sort((a, b) => a.seq - b.seq)
      .map((stop) => ({
        ...stop,
        distance: projectOnLine(this.coords, this.cum, [stop.lng, stop.lat]).distance,
      }));
    // Stops must advance monotonically along the line even if a projection wobbles.
    for (let i = 1; i < this.stops.length; i += 1) {
      if (this.stops[i].distance <= this.stops[i - 1].distance) {
        this.stops[i].distance = Math.min(this.totalDistance, this.stops[i - 1].distance + 25);
      }
    }

    const requested = init.targetStopSeq ?? maxSeq;
    this.targetStopSeq = reverse ? maxSeq - requested : requested;
    this.currentStopSeq = this.stops[0]?.seq ?? 0;
    this.syncStopCursor();
  }

  /* ---------------------------------------------------------------- *
   * Derived values
   * ---------------------------------------------------------------- */

  get targetStop(): SimStop | undefined {
    return this.stops.find((s) => s.seq === this.targetStopSeq) ?? this.stops[this.stops.length - 1];
  }

  get targetDistance(): number {
    return this.targetStop?.distance ?? this.totalDistance;
  }

  get progress(): number {
    return this.totalDistance > 0 ? clamp(this.distance / this.totalDistance, 0, 1) : 0;
  }

  private get nominalSpeedMs(): number {
    return (this.baseSpeedKmh * 1000) / 3600;
  }

  private get isMovingState(): boolean {
    return this.state === 'en_route' || this.state === 'approaching' || this.state === 'delayed';
  }

  /** Dwell time still to be served at stops between here and the watched stop. */
  private dwellAhead(): number {
    let total = 0;
    for (const stop of this.stops) {
      if (stop.distance > this.distance && stop.seq < this.targetStopSeq) total += stop.dwell_seconds;
    }
    return total;
  }

  private computeEta(): number {
    if (this.state === 'arrived') return 0;
    const remaining = Math.max(0, this.targetDistance - this.distance);
    const travel = this.nominalSpeedMs > 0 ? remaining / this.nominalSpeedMs : 0;
    return Math.max(0, Math.round(travel + this.dwellAhead() + this.dwellRemaining + this.delaySeconds));
  }

  private reportedSpeed(): number {
    if (this.paused || !this.isMovingState || this.dwellRemaining > 0) return 0;
    return Math.round(this.baseSpeedKmh * (this.state === 'delayed' ? DELAY_CRAWL_FACTOR : 1));
  }

  /* ---------------------------------------------------------------- *
   * Tick
   * ---------------------------------------------------------------- */

  /** Advance the simulation by `dtSeconds` of wall clock. */
  tick(dtSeconds: number): TripUpdate {
    const dt = clamp(dtSeconds, 0, 2) * this.speedMultiplier;

    if (!this.paused && dt > 0) {
      if (this.state === 'boarding') {
        this.dwellRemaining = Math.max(0, this.dwellRemaining - dt);
        if (this.dwellRemaining === 0) this.setState('en_route');
      } else if (this.isMovingState) {
        if (this.state === 'delayed') {
          this.delaySeconds = Math.max(0, this.delaySeconds - dt);
          if (this.delaySeconds === 0) this.setState('en_route');
        }
        if (this.dwellRemaining > 0) {
          this.dwellRemaining = Math.max(0, this.dwellRemaining - dt);
        } else {
          const factor = this.state === 'delayed' ? DELAY_CRAWL_FACTOR : 1;
          this.advance(this.nominalSpeedMs * factor * dt);
        }
      }
    }

    // Automatic approach / arrival transitions.
    if (this.state !== 'arrived') {
      const eta = this.computeEta();
      if (this.state === 'en_route' && eta < APPROACHING_ETA_SECONDS) this.setState('approaching');
      else if (this.state === 'approaching' && eta > LEAVE_APPROACHING_ETA_SECONDS) this.setState('en_route');
    }

    return this.toUpdate();
  }

  private advance(metres: number): void {
    if (metres <= 0) return;
    this.distance = Math.min(this.totalDistance, this.distance + metres);

    while (this.nextStopIndex < this.stops.length && this.distance >= this.stops[this.nextStopIndex].distance) {
      const stop = this.stops[this.nextStopIndex];
      this.currentStopSeq = stop.seq;
      this.nextStopIndex += 1;
      this.pendingEvents.push({ type: 'stop_reached', seq: stop.seq });
      if (stop.seq >= this.targetStopSeq) {
        this.arrive();
        return;
      }
      this.dwellRemaining = stop.dwell_seconds;
      break; // serve one stop per tick so the dwell is respected
    }

    if (this.distance >= this.targetDistance - 0.5) this.arrive();
  }

  private arrive(): void {
    this.distance = this.targetDistance;
    this.dwellRemaining = 0;
    this.delaySeconds = 0;
    this.currentStopSeq = this.targetStopSeq;
    this.syncStopCursor();
    if (this.state !== 'arrived') {
      this.setState('arrived');
      this.pendingEvents.push({ type: 'arrived' });
    }
  }

  private syncStopCursor(): void {
    let next = this.stops.length;
    for (let i = 0; i < this.stops.length; i += 1) {
      if (this.stops[i].distance > this.distance + 0.5) {
        next = i;
        break;
      }
    }
    this.nextStopIndex = next;
    const passed = this.stops.filter((s) => s.distance <= this.distance + 0.5);
    this.currentStopSeq = passed.length ? passed[passed.length - 1].seq : (this.stops[0]?.seq ?? 0);
  }

  /* ---------------------------------------------------------------- *
   * Commands (admin console, driver view, scenario runner)
   * ---------------------------------------------------------------- */

  setState(state: TripState): void {
    if (state === this.state) return;
    const previous = this.state;
    this.state = state;
    if (state === 'arrived') {
      this.distance = this.targetDistance;
      this.dwellRemaining = 0;
    }
    if (state === 'boarding' && this.dwellRemaining === 0) {
      this.dwellRemaining = this.stops[0]?.dwell_seconds ?? 20;
    }
    if (state === 'delayed' && this.delaySeconds === 0) this.delaySeconds = 300;
    if (state === 'idle') this.reset();
    this.pendingEvents.push({ type: 'state', state, previous });
  }

  start(): void {
    if (this.state === 'arrived' || this.state === 'idle') this.reset();
    this.paused = false;
    this.dwellRemaining = this.stops[0]?.dwell_seconds ?? 20;
    this.setState('boarding');
    this.pendingEvents.push({ type: 'started' });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (this.state === 'idle') this.start();
  }

  reset(): void {
    this.distance = 0;
    this.delaySeconds = 0;
    this.dwellRemaining = 0;
    this.paused = false;
    this.state = 'idle';
    this.syncStopCursor();
    this.pendingEvents.push({ type: 'reset' });
  }

  /**
   * Put the bus wherever it needs to be for the countdown to read `seconds`.
   * Moving the bus (rather than changing its speed) keeps map, rail and ETA consistent.
   */
  setEta(seconds: number): void {
    const wanted = Math.max(0, seconds);
    if (this.state === 'idle' || this.state === 'boarding') this.setState('en_route');
    this.paused = false;

    const place = (budget: number): void => {
      const travel = Math.max(0, budget) * this.nominalSpeedMs;
      this.distance = clamp(this.targetDistance - travel, 0, this.totalDistance);
      this.syncStopCursor();
    };

    place(wanted - this.delaySeconds);
    // One refinement pass now that we know which stops lie ahead.
    place(wanted - this.delaySeconds - this.dwellAhead());

    this.dwellRemaining = 0;
    if (wanted <= 0) this.arrive();
    else if (this.state === 'arrived') this.setState('en_route');
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = clamp(multiplier, 0.1, 60);
  }

  setDelay(seconds: number): void {
    this.delaySeconds = Math.max(0, seconds);
    if (this.delaySeconds > 0) {
      if (this.state !== 'delayed') this.setState('delayed');
    } else if (this.state === 'delayed') {
      this.setState('en_route');
    }
  }

  jumpToStop(seq: number): void {
    const stop = this.stops.find((s) => s.seq === seq) ?? this.stops[this.stops.length - 1];
    if (!stop) return;
    this.distance = clamp(stop.distance, 0, this.totalDistance);
    this.dwellRemaining = 0;
    this.syncStopCursor();
    if (stop.seq >= this.targetStopSeq) this.arrive();
    else if (!this.isMovingState) this.setState('en_route');
  }

  nextStop(): void {
    const upcoming = this.stops.find((s) => s.distance > this.distance + 0.5);
    if (upcoming) this.jumpToStop(upcoming.seq);
    else this.arriveNow();
  }

  arriveNow(): void {
    this.paused = false;
    this.arrive();
  }

  /* ---------------------------------------------------------------- *
   * Output
   * ---------------------------------------------------------------- */

  drainEvents(): SimEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  toUpdate(): TripUpdate {
    const { position, heading } = pointAtDistance(this.coords, this.cum, this.distance);
    return {
      tripId: this.tripId,
      busId: this.busId,
      routeId: this.routeId,
      state: this.state,
      progress: this.progress,
      lng: Number(position[0].toFixed(6)),
      lat: Number(position[1].toFixed(6)),
      heading: Math.round(heading),
      speed_kmh: this.reportedSpeed(),
      eta_seconds: this.computeEta(),
      delay_seconds: Math.round(this.delaySeconds),
      current_stop_seq: this.currentStopSeq,
      target_stop_seq: this.targetStopSeq,
      total_stops: this.stops.length,
      distance_m: Math.max(0, Math.round(this.targetDistance - this.distance)),
      updated_at: Date.now(),
      simulated: this.simulated,
    };
  }

  /** Restore runtime state (used when the server reloads a persisted trip). */
  hydrate(partial: Partial<Pick<TripSimulator, 'distance' | 'state' | 'delaySeconds' | 'speedMultiplier'>>): void {
    if (typeof partial.distance === 'number') this.distance = clamp(partial.distance, 0, this.totalDistance);
    if (partial.state) this.state = partial.state;
    if (typeof partial.delaySeconds === 'number') this.delaySeconds = partial.delaySeconds;
    if (typeof partial.speedMultiplier === 'number') this.speedMultiplier = partial.speedMultiplier;
    this.syncStopCursor();
    this.pendingEvents = [];
  }
}
