/**
 * Scripted demo scenarios (§8.2 presets, reused verbatim by user Demo Mode §9).
 *
 * A scenario is data, not code, so the admin console and the in-browser DemoEngine
 * run byte-identical timelines. `ScenarioRunner` mutates a TripSimulator for trip
 * actions and hands UI-only actions (island / notify / haptic) to its host.
 */
import type { TripSimulator } from './simulation';
import type { IslandMode, NotifyKind, RouteDirection, TripState } from './types';

export const SCENARIO_IDS = [
  'morning_pickup',
  'afternoon_dropoff',
  'traffic_delay',
  'arriving_now',
  'emergency_stop',
  'full_journey',
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type ScenarioAction =
  | { kind: 'reset' }
  | { kind: 'start' }
  | { kind: 'boarding'; seconds: number }
  | { kind: 'state'; state: TripState }
  | { kind: 'eta'; seconds: number }
  | { kind: 'speed'; multiplier: number }
  | { kind: 'delay'; seconds: number }
  | { kind: 'jump'; seq: number }
  | { kind: 'arrive' }
  | { kind: 'direction'; direction: RouteDirection }
  | { kind: 'island'; mode: IslandMode; durationMs?: number }
  | { kind: 'notify'; title_en: string; body_en: string; title_ar: string; body_ar: string; tone: NotifyKind }
  | { kind: 'haptic'; pattern: number[] };

export type ScenarioTrigger =
  | { type: 'time'; seconds: number }
  | { type: 'progress'; value: number }
  | { type: 'eta'; seconds: number }
  | { type: 'state'; state: TripState };

export interface ScenarioStep {
  id: string;
  when: ScenarioTrigger;
  actions: ScenarioAction[];
}

export interface Scenario {
  id: ScenarioId;
  name_en: string;
  name_ar: string;
  summary_en: string;
  summary_ar: string;
  /** Restart from the top a few seconds after arrival. */
  loop: boolean;
  steps: ScenarioStep[];
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  morning_pickup: {
    id: 'morning_pickup',
    name_en: 'Morning Pickup',
    name_ar: 'رحلة الصباح',
    summary_en: 'Boarding 20s, then en route with a 12 minute ETA at 5x.',
    summary_ar: 'صعود الطلاب ٢٠ ثانية ثم انطلاق مع وصول خلال ١٢ دقيقة بسرعة ٥×.',
    loop: false,
    steps: [
      {
        id: 'mp-0',
        when: { type: 'time', seconds: 0 },
        actions: [
          { kind: 'reset' },
          { kind: 'speed', multiplier: 5 },
          { kind: 'boarding', seconds: 20 },
          { kind: 'island', mode: 'expanded', durationMs: 5000 },
        ],
      },
      {
        id: 'mp-1',
        when: { type: 'time', seconds: 20 },
        actions: [
          { kind: 'state', state: 'en_route' },
          { kind: 'eta', seconds: 720 },
          {
            kind: 'notify',
            title_en: 'Bus #3 has departed',
            body_en: 'Khalid is on board. Arriving in about 12 minutes.',
            title_ar: 'انطلقت الحافلة رقم ٣',
            body_ar: 'خالد على متن الحافلة. الوصول خلال ١٢ دقيقة تقريباً.',
            tone: 'info',
          },
        ],
      },
      {
        id: 'mp-2',
        when: { type: 'eta', seconds: 180 },
        actions: [
          { kind: 'island', mode: 'expanded', durationMs: 5000 },
          { kind: 'haptic', pattern: [20, 40, 20] },
        ],
      },
    ],
  },

  afternoon_dropoff: {
    id: 'afternoon_dropoff',
    name_en: 'Afternoon Drop-off',
    name_ar: 'رحلة العودة',
    summary_en: 'The route runs in reverse, school to home, ETA 18 minutes.',
    summary_ar: 'المسار بالاتجاه المعاكس من المدرسة إلى المنزل، الوصول خلال ١٨ دقيقة.',
    loop: false,
    steps: [
      {
        id: 'ad-0',
        when: { type: 'time', seconds: 0 },
        actions: [
          { kind: 'direction', direction: 'afternoon' },
          { kind: 'speed', multiplier: 5 },
          { kind: 'boarding', seconds: 15 },
          { kind: 'island', mode: 'expanded', durationMs: 4000 },
        ],
      },
      {
        id: 'ad-1',
        when: { type: 'time', seconds: 15 },
        actions: [
          { kind: 'state', state: 'en_route' },
          { kind: 'eta', seconds: 1080 },
          {
            kind: 'notify',
            title_en: 'Heading home',
            body_en: 'Bus #3 left Al Wathba Model School. ETA 18 minutes.',
            title_ar: 'في الطريق إلى المنزل',
            body_ar: 'غادرت الحافلة رقم ٣ مدرسة الوثبة النموذجية. الوصول خلال ١٨ دقيقة.',
            tone: 'info',
          },
        ],
      },
    ],
  },

  traffic_delay: {
    id: 'traffic_delay',
    name_en: 'Traffic Delay',
    name_ar: 'ازدحام مروري',
    summary_en: 'Halfway through the route a 9 minute delay is injected.',
    summary_ar: 'عند منتصف المسار يُضاف تأخير ٩ دقائق.',
    loop: false,
    steps: [
      {
        id: 'td-0',
        when: { type: 'time', seconds: 0 },
        actions: [
          { kind: 'reset' },
          { kind: 'speed', multiplier: 5 },
          { kind: 'state', state: 'en_route' },
          { kind: 'eta', seconds: 900 },
        ],
      },
      {
        id: 'td-1',
        when: { type: 'progress', value: 0.5 },
        actions: [
          { kind: 'delay', seconds: 540 },
          { kind: 'state', state: 'delayed' },
          { kind: 'island', mode: 'expanded', durationMs: 6000 },
          { kind: 'haptic', pattern: [60, 40, 60] },
          {
            kind: 'notify',
            title_en: 'Bus #3 is delayed',
            body_en: 'Traffic on Al Jimi Street. New arrival is about 9 minutes later.',
            title_ar: 'تأخر الحافلة رقم ٣',
            body_ar: 'ازدحام في شارع الجيمي. الوصول متأخر بحوالي ٩ دقائق.',
            tone: 'warn',
          },
        ],
      },
      {
        id: 'td-2',
        when: { type: 'eta', seconds: 180 },
        actions: [{ kind: 'island', mode: 'expanded', durationMs: 5000 }],
      },
    ],
  },

  arriving_now: {
    id: 'arriving_now',
    name_en: 'Arriving Now',
    name_ar: 'على وشك الوصول',
    summary_en: 'Jumps straight to a 45 second countdown with the island expanded.',
    summary_ar: 'الانتقال مباشرة إلى عدّ تنازلي ٤٥ ثانية مع فتح الجزيرة.',
    loop: false,
    steps: [
      {
        id: 'an-0',
        when: { type: 'time', seconds: 0 },
        actions: [
          { kind: 'speed', multiplier: 1 },
          { kind: 'eta', seconds: 45 },
          { kind: 'state', state: 'approaching' },
          { kind: 'island', mode: 'expanded', durationMs: 8000 },
          { kind: 'haptic', pattern: [30, 50, 30] },
          {
            kind: 'notify',
            title_en: 'Almost there',
            body_en: 'Bus #3 reaches Al Jimi Park in under a minute.',
            title_ar: 'اقترب الوصول',
            body_ar: 'تصل الحافلة رقم ٣ إلى حديقة الجيمي خلال أقل من دقيقة.',
            tone: 'success',
          },
        ],
      },
    ],
  },

  emergency_stop: {
    id: 'emergency_stop',
    name_en: 'Emergency Stop',
    name_ar: 'توقف طارئ',
    summary_en: 'The bus halts mid-route and pushes a red alert.',
    summary_ar: 'توقف الحافلة في منتصف الطريق مع تنبيه أحمر.',
    loop: false,
    steps: [
      {
        id: 'es-0',
        when: { type: 'time', seconds: 0 },
        actions: [
          { kind: 'speed', multiplier: 1 },
          { kind: 'eta', seconds: 600 },
          { kind: 'state', state: 'stopped' },
          { kind: 'island', mode: 'expanded', durationMs: 10000 },
          { kind: 'haptic', pattern: [80, 40, 80, 40, 160] },
          {
            kind: 'notify',
            title_en: 'Bus #3 has stopped',
            body_en: 'The driver reported an unplanned stop. The school has been notified.',
            title_ar: 'توقفت الحافلة رقم ٣',
            body_ar: 'أبلغ السائق عن توقف غير مجدول. تم إخطار المدرسة.',
            tone: 'warn',
          },
        ],
      },
    ],
  },

  full_journey: {
    id: 'full_journey',
    name_en: 'Full Journey Loop',
    name_ar: 'الرحلة الكاملة',
    summary_en: 'Runs the whole route end to end at 10x, then starts over.',
    summary_ar: 'تشغيل المسار كاملاً بسرعة ١٠× ثم إعادة البدء.',
    loop: true,
    steps: [
      {
        id: 'fj-0',
        when: { type: 'time', seconds: 0 },
        actions: [
          { kind: 'reset' },
          { kind: 'speed', multiplier: 10 },
          { kind: 'boarding', seconds: 10 },
          { kind: 'island', mode: 'compact' },
        ],
      },
      {
        id: 'fj-1',
        when: { type: 'time', seconds: 10 },
        actions: [{ kind: 'state', state: 'en_route' }],
      },
    ],
  },
};

export function getScenario(id: string | null | undefined): Scenario {
  const key = (id ?? 'morning_pickup') as ScenarioId;
  return SCENARIOS[key] ?? SCENARIOS.morning_pickup;
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value);
}

/** Actions the simulator cannot perform itself — the host dispatches these. */
export function isUiAction(action: ScenarioAction): boolean {
  return action.kind === 'island' || action.kind === 'notify' || action.kind === 'haptic';
}

export interface ScenarioHost {
  /** The simulator to drive. May be swapped by the host on a `direction` action. */
  simulator(): TripSimulator;
  /** Rebuild the simulator for the other direction; returns the new one. */
  setDirection?(direction: RouteDirection): TripSimulator;
  /** Island / notification / haptic actions. */
  dispatch(action: ScenarioAction): void;
}

/**
 * Walks a scenario timeline. `tick` takes wall-clock seconds and converts them to
 * simulated seconds using the simulator's current multiplier, so a `time` trigger of
 * 20s fires after 4 real seconds at 5x — the same arithmetic the bus itself uses.
 */
export class ScenarioRunner {
  private elapsed = 0;
  private fired = new Set<string>();
  private arrivedFor = 0;

  constructor(
    public scenario: Scenario,
    private host: ScenarioHost,
  ) {}

  get progressLabel(): string {
    return `${this.fired.size}/${this.scenario.steps.length}`;
  }

  restart(): void {
    this.elapsed = 0;
    this.arrivedFor = 0;
    this.fired.clear();
  }

  swap(scenario: Scenario): void {
    this.scenario = scenario;
    this.restart();
  }

  tick(wallSeconds: number): void {
    const sim = this.host.simulator();
    this.elapsed += wallSeconds * sim.speedMultiplier;

    for (const step of this.scenario.steps) {
      if (this.fired.has(step.id)) continue;
      if (!this.shouldFire(step.when, sim)) continue;
      this.fired.add(step.id);
      for (const action of step.actions) this.apply(action);
    }

    if (this.scenario.loop) {
      const current = this.host.simulator();
      if (current.state === 'arrived') {
        this.arrivedFor += wallSeconds * current.speedMultiplier;
        if (this.arrivedFor > 6) {
          this.restart();
          current.reset();
        }
      } else {
        this.arrivedFor = 0;
      }
    }
  }

  private shouldFire(trigger: ScenarioTrigger, sim: TripSimulator): boolean {
    switch (trigger.type) {
      case 'time':
        return this.elapsed >= trigger.seconds;
      case 'progress':
        return sim.progress >= trigger.value;
      case 'eta':
        return sim.toUpdate().eta_seconds <= trigger.seconds && sim.state !== 'idle';
      case 'state':
        return sim.state === trigger.state;
      default:
        return false;
    }
  }

  private apply(action: ScenarioAction): void {
    if (isUiAction(action)) {
      this.host.dispatch(action);
      return;
    }
    const sim = this.host.simulator();
    switch (action.kind) {
      case 'reset':
        sim.reset();
        break;
      case 'start':
        sim.start();
        break;
      case 'boarding':
        sim.setState('boarding');
        sim.dwellRemaining = action.seconds;
        sim.paused = false;
        break;
      case 'state':
        sim.setState(action.state);
        break;
      case 'eta':
        sim.setEta(action.seconds);
        break;
      case 'speed':
        sim.setSpeedMultiplier(action.multiplier);
        break;
      case 'delay':
        sim.setDelay(action.seconds);
        break;
      case 'jump':
        sim.jumpToStop(action.seq);
        break;
      case 'arrive':
        sim.arriveNow();
        break;
      case 'direction': {
        const next = this.host.setDirection?.(action.direction);
        if (next) next.setSpeedMultiplier(sim.speedMultiplier);
        break;
      }
      default:
        break;
    }
  }
}
