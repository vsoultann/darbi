/**
 * The authoritative trip loop (§8.3).
 *
 * One TripSimulator per bus, ticked at `env.tickMs` (250 ms by default). Clients only
 * render what lands here; they never compute ETA themselves. State is persisted to
 * SQLite every couple of seconds so a restart mid-demo resumes where it left off.
 */
import type { Server } from 'socket.io';
import { ScenarioRunner, getScenario, type ScenarioAction, type ScenarioId } from '../../shared/scenarios';
import { TripSimulator, type SimulatorInit } from '../../shared/simulation';
import type {
  ClientToServerEvents,
  NotifyPayload,
  RouteDirection,
  ServerToClientEvents,
  TripUpdate,
} from '../../shared/types';
import * as repo from '../db/repo';
import { env } from '../env';

export type DarbiServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface ActiveTrip {
  id: string;
  busId: string;
  routeId: string;
  direction: RouteDirection;
  sim: TripSimulator;
  init: SimulatorInit;
  runner: ScenarioRunner | null;
  scenario: ScenarioId | null;
  lastPersist: number;
}

export function tripRoom(tripId: string): string {
  return `trip:${tripId}`;
}

export class TripTicker {
  private trips = new Map<string, ActiveTrip>();
  private timer: NodeJS.Timeout | null = null;
  private lastTick = Date.now();

  constructor(private io: DarbiServer) {}

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  start(): void {
    if (this.timer) return;
    for (const bus of repo.listBuses()) this.ensureTrip(bus.id);
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), env.tickMs);
    console.log(`[darbi] ticker running at ${env.tickMs}ms for ${this.trips.size} buses`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Builds (or returns) the live simulator for a bus. */
  ensureTrip(busId: string): ActiveTrip | null {
    const tripId = `trip-${busId}`;
    const existing = this.trips.get(tripId);
    if (existing) return existing;

    const bus = repo.getBus(busId);
    if (!bus) return null;
    const route = repo.getRoute(bus.route_id);
    if (!route) return null;
    const stops = repo.getStops(route.id);
    if (stops.length < 2) return null;

    const row = repo.getTrip(tripId) ?? repo.createTrip({ id: tripId, bus_id: busId, route_id: route.id });

    const init: SimulatorInit = {
      tripId,
      busId,
      routeId: route.id,
      coordinates: route.polyline.coordinates,
      stops: stops.map((s) => ({ seq: s.seq, lat: s.lat, lng: s.lng, dwell_seconds: s.dwell_seconds })),
      targetStopSeq: stops[stops.length - 1].seq,
      simulated: false,
    };

    const sim = new TripSimulator(init);
    sim.hydrate({
      distance: (row.progress ?? 0) * sim.totalDistance,
      state: row.state,
      delaySeconds: row.delay_seconds,
    });

    const active: ActiveTrip = {
      id: tripId,
      busId,
      routeId: route.id,
      direction: route.direction,
      sim,
      init,
      runner: null,
      scenario: null,
      lastPersist: 0,
    };
    this.trips.set(tripId, active);
    return active;
  }

  get(tripId: string): ActiveTrip | null {
    return this.trips.get(tripId) ?? null;
  }

  getByBus(busId: string): ActiveTrip | null {
    return this.ensureTrip(busId);
  }

  list(): ActiveTrip[] {
    return [...this.trips.values()];
  }

  update(tripId: string): TripUpdate | null {
    return this.trips.get(tripId)?.sim.toUpdate() ?? null;
  }

  /* ---------------------------------------------------------------- *
   * Tick
   * ---------------------------------------------------------------- */

  private tick(): void {
    const now = Date.now();
    const dt = Math.min(2, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const trip of this.trips.values()) {
      const update = trip.sim.tick(dt);
      trip.runner?.tick(dt);
      this.drainEvents(trip);
      this.io.to(tripRoom(trip.id)).emit('trip:update', update);

      if (now - trip.lastPersist > 2000) {
        trip.lastPersist = now;
        this.persist(trip, update);
      }
    }
  }

  private persist(trip: ActiveTrip, update: TripUpdate): void {
    repo.saveTripState({
      id: trip.id,
      bus_id: trip.busId,
      route_id: trip.routeId,
      state: update.state,
      current_stop_seq: update.current_stop_seq,
      progress: update.progress,
      lat: update.lat,
      lng: update.lng,
      heading: update.heading,
      speed_kmh: update.speed_kmh,
      eta_seconds: update.eta_seconds,
      delay_seconds: update.delay_seconds,
      distance_m: update.distance_m,
      updated_at: update.updated_at,
      started_at: update.state === 'boarding' ? Date.now() : null,
      ended_at: update.state === 'arrived' ? Date.now() : null,
    });
  }

  /** Turns simulator events into persisted history plus the odd live notification. */
  private drainEvents(trip: ActiveTrip): void {
    for (const event of trip.sim.drainEvents()) {
      repo.insertEvent(trip.id, event.type, event);
      if (event.type === 'arrived') {
        this.notify(trip, {
          title_en: 'Arrived',
          body_en: 'The bus has reached its final stop.',
          title_ar: 'تم الوصول',
          body_ar: 'وصلت الحافلة إلى محطتها الأخيرة.',
          kind: 'success',
        });
        this.io.to(tripRoom(trip.id)).emit('ui:burst');
      }
      if (event.type === 'state' && event.state === 'delayed') {
        this.notify(trip, {
          title_en: 'Bus delayed',
          body_en: 'Traffic on the route. The countdown has been updated.',
          title_ar: 'تأخر الحافلة',
          body_ar: 'ازدحام على المسار. تم تحديث وقت الوصول.',
          kind: 'warn',
        });
      }
    }
  }

  private notify(trip: ActiveTrip, payload: NotifyPayload): void {
    this.io.to(tripRoom(trip.id)).emit('ui:notify', payload);
  }

  /* ---------------------------------------------------------------- *
   * Scenarios
   * ---------------------------------------------------------------- */

  runScenario(tripId: string, scenarioId: ScenarioId): boolean {
    const trip = this.trips.get(tripId);
    if (!trip) return false;
    const scenario = getScenario(scenarioId);
    trip.scenario = scenario.id;
    trip.runner = new ScenarioRunner(scenario, {
      simulator: () => trip.sim,
      setDirection: (direction) => this.setDirection(trip, direction),
      dispatch: (action) => this.dispatchUiAction(trip, action),
    });
    return true;
  }

  clearScenario(tripId: string): void {
    const trip = this.trips.get(tripId);
    if (!trip) return;
    trip.runner = null;
    trip.scenario = null;
  }

  private setDirection(trip: ActiveTrip, direction: RouteDirection): TripSimulator {
    const multiplier = trip.sim.speedMultiplier;
    trip.direction = direction;
    trip.sim = new TripSimulator({ ...trip.init, reverse: direction === 'afternoon' });
    trip.sim.setSpeedMultiplier(multiplier);
    return trip.sim;
  }

  /** Island / notification / haptic actions produced by a scenario step. */
  private dispatchUiAction(trip: ActiveTrip, action: ScenarioAction): void {
    const room = this.io.to(tripRoom(trip.id));
    if (action.kind === 'island') room.emit('ui:island', { mode: action.mode, durationMs: action.durationMs });
    else if (action.kind === 'haptic') room.emit('ui:haptic', { pattern: action.pattern });
    else if (action.kind === 'notify') {
      room.emit('ui:notify', {
        title_en: action.title_en,
        body_en: action.body_en,
        title_ar: action.title_ar,
        body_ar: action.body_ar,
        kind: action.tone,
      });
    }
  }
}
