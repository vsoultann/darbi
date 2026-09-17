/**
 * DemoEngine — the whole Darbi experience with no bus and no server (§9).
 *
 * It instantiates the *same* TripSimulator the server runs and the *same* scenario
 * scripts the admin console uses, then emits frames on the same 250 ms cadence. The
 * only difference in the payload is `simulated: true`.
 */
import { ScenarioRunner, getScenario, type ScenarioAction, type ScenarioId } from '@shared/scenarios';
import { TripSimulator } from '@shared/simulation';
import type { RouteDirection, TrackPayload, TripUpdate } from '@shared/types';

const TICK_MS = 250;

export interface DemoEngineOptions {
  payload: TrackPayload;
  scenario: ScenarioId;
  speed: number;
  autoLoop: boolean;
  onUpdate: (update: TripUpdate) => void;
  onAction: (action: ScenarioAction) => void;
}

export class DemoEngine {
  private sim: TripSimulator;
  private runner: ScenarioRunner;
  private timer: number | null = null;
  private lastTick = 0;
  private direction: RouteDirection = 'morning';

  constructor(private options: DemoEngineOptions) {
    this.sim = this.build(false);
    this.runner = this.makeRunner(options.scenario);
    this.sim.setSpeedMultiplier(options.speed);
  }

  /** Builds a simulator from the same route geometry the map draws. */
  private build(reverse: boolean): TripSimulator {
    const { route, stops, student, bus } = this.options.payload;
    const studentStop = stops.find((s) => s.id === student.stop_id);
    // Morning runs to the school (the last stop); the afternoon run ends at the child's stop.
    const targetSeq = reverse
      ? (studentStop?.seq ?? stops[stops.length - 1].seq)
      : stops[stops.length - 1].seq;

    return new TripSimulator({
      tripId: `demo-${bus.id}`,
      busId: bus.id,
      routeId: route.id,
      coordinates: route.polyline.coordinates,
      stops: stops.map((s) => ({ seq: s.seq, lat: s.lat, lng: s.lng, dwell_seconds: s.dwell_seconds })),
      targetStopSeq: targetSeq,
      reverse,
      simulated: true,
    });
  }

  private makeRunner(scenarioId: ScenarioId): ScenarioRunner {
    const base = getScenario(scenarioId);
    const scenario = { ...base, loop: this.options.autoLoop || base.loop };
    return new ScenarioRunner(scenario, {
      simulator: () => this.sim,
      setDirection: (direction) => {
        this.direction = direction;
        const multiplier = this.sim.speedMultiplier;
        this.sim = this.build(direction === 'afternoon');
        this.sim.setSpeedMultiplier(multiplier);
        return this.sim;
      },
      dispatch: (action) => this.options.onAction(action),
    });
  }

  start(): void {
    if (this.timer !== null) return;
    this.lastTick = performance.now();
    this.options.onUpdate(this.sim.toUpdate());
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min(2, (now - this.lastTick) / 1000);
    this.lastTick = now;
    this.sim.tick(dt);
    this.runner.tick(dt);
    // Events are drained so the simulator does not accumulate them in the browser.
    this.sim.drainEvents();
    this.options.onUpdate(this.sim.toUpdate());
  }

  setScenario(scenarioId: ScenarioId): void {
    this.direction = 'morning';
    this.sim = this.build(false);
    this.sim.setSpeedMultiplier(this.options.speed);
    this.runner = this.makeRunner(scenarioId);
    this.options.onUpdate(this.sim.toUpdate());
  }

  setSpeed(multiplier: number): void {
    this.options.speed = multiplier;
    this.sim.setSpeedMultiplier(multiplier);
  }

  setAutoLoop(autoLoop: boolean): void {
    this.options.autoLoop = autoLoop;
    const scenario = this.runner.scenario;
    this.runner.swap({ ...scenario, loop: autoLoop || getScenario(scenario.id).loop });
  }

  reset(): void {
    this.sim.reset();
    this.runner.restart();
    this.options.onUpdate(this.sim.toUpdate());
  }

  get currentDirection(): RouteDirection {
    return this.direction;
  }
}
