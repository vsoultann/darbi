/**
 * Darbi — shared contract.
 *
 * This file is imported by BOTH the Express/Socket.IO server and the React client.
 * If a shape changes here it changes everywhere; nothing else may redeclare these types.
 */

/* ------------------------------------------------------------------ *
 * Core enums
 * ------------------------------------------------------------------ */

/** Single source of truth for trip state — used by the DB, the socket feed and the UI. */
export const TRIP_STATES = [
  'idle',
  'boarding',
  'en_route',
  'approaching',
  'arrived',
  'delayed',
  'stopped',
] as const;
export type TripState = (typeof TRIP_STATES)[number];

export const ISLAND_MODES = ['minimal', 'compact', 'expanded'] as const;
export type IslandMode = (typeof ISLAND_MODES)[number];

export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export type RouteDirection = 'morning' | 'afternoon';
export type NotifyKind = 'info' | 'warn' | 'success';

/** `[lng, lat]`, GeoJSON order. */
export type Position = [number, number];

/* ------------------------------------------------------------------ *
 * Domain entities (mirror the SQLite schema in server/db/schema.sql)
 * ------------------------------------------------------------------ */

export interface School {
  id: string;
  name_en: string;
  name_ar: string;
  emirate: string;
  lat: number;
  lng: number;
  logo_url: string | null;
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: Position[];
}

export interface BusRoute {
  id: string;
  school_id: string;
  name_en: string;
  name_ar: string;
  polyline: LineStringGeometry;
  direction: RouteDirection;
}

export interface Stop {
  id: string;
  route_id: string;
  seq: number;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
  dwell_seconds: number;
}

export interface Driver {
  id: string;
  name_en: string;
  name_ar: string;
  phone: string;
  license_no: string;
  photo_url: string | null;
}

export interface Bus {
  id: string;
  school_id: string;
  route_id: string;
  plate: string;
  capacity: number;
  driver_id: string | null;
  status: string;
}

export interface Student {
  id: string;
  school_id: string;
  name_en: string;
  name_ar: string;
  /** Public lookup key — the only credential a parent needs. */
  student_no: string;
  grade: string;
  bus_id: string;
  stop_id: string;
  guardian_phone: string;
  photo_url: string | null;
}

/* ------------------------------------------------------------------ *
 * The live feed
 * ------------------------------------------------------------------ */

/**
 * One authoritative frame of a trip. The server ticker produces these at 4 Hz and the
 * client-side DemoEngine produces byte-identical ones — the UI cannot tell them apart.
 */
export interface TripUpdate {
  tripId: string;
  busId: string;
  routeId: string;
  state: TripState;
  /** 0..1 along the whole route polyline. */
  progress: number;
  lat: number;
  lng: number;
  /** Degrees clockwise from north. */
  heading: number;
  speed_kmh: number;
  /** Seconds until the watched stop, at nominal speed (does not shrink when the sim runs fast). */
  eta_seconds: number;
  delay_seconds: number;
  current_stop_seq: number;
  /** The stop this parent cares about (their child's). */
  target_stop_seq: number;
  total_stops: number;
  /** Metres still to drive to the watched stop. */
  distance_m: number;
  /** Producer clock, epoch ms. */
  updated_at: number;
  /** True when the frame came from a client-side simulation rather than the server. */
  simulated: boolean;
}

export interface TripRecord {
  id: string;
  bus_id: string;
  route_id: string;
  started_at: number | null;
  ended_at: number | null;
  state: TripState;
}

/** Everything `/track/:studentNo` needs in one request. */
export interface TrackPayload {
  school: School;
  student: Student;
  bus: Bus;
  driver: Driver | null;
  route: BusRoute;
  stops: Stop[];
  trip: TripUpdate;
}

/* ------------------------------------------------------------------ *
 * Remote-control commands (§8)
 * ------------------------------------------------------------------ */

export const ADMIN_COMMANDS = [
  'trip:start',
  'trip:pause',
  'trip:resume',
  'trip:reset',
  'trip:setEta',
  'trip:setSpeed',
  'trip:nextStop',
  'trip:jumpToStop',
  'trip:arriveNow',
  'trip:setState',
  'trip:setDelay',
  'trip:scenario',
  'ui:island',
  'ui:aod',
  'ui:notify',
  'ui:haptic',
  'ui:lang',
  'ui:burst',
] as const;
export type AdminCommandName = (typeof ADMIN_COMMANDS)[number];

export interface AdminCommand {
  /** `'all'` broadcasts; otherwise a session code such as `DRB-4K7X`. */
  target: 'all' | string;
  command: AdminCommandName;
  payload?: Record<string, unknown>;
}

export interface IslandCommand {
  mode: IslandMode;
  durationMs?: number;
}

export interface NotifyPayload {
  title_en: string;
  body_en: string;
  title_ar: string;
  body_ar: string;
  kind: NotifyKind;
}

/* ------------------------------------------------------------------ *
 * Demo session registry (§8.1)
 * ------------------------------------------------------------------ */

export interface DemoSession {
  sessionCode: string;
  socketId: string;
  label: string;
  device: string;
  browser: string;
  os: string;
  lang: Lang;
  /** Client-side path, e.g. `/track/123456`. */
  route: string;
  screen: string;
  studentNo: string | null;
  tripId: string | null;
  mode: 'live' | 'demo';
  scenario: string | null;
  createdAt: number;
  lastSeen: number;
  /** True while an admin is driving this session. */
  controlled: boolean;
}

export interface RegisterPayload {
  label: string;
  userAgent: string;
  screen: string;
  lang: Lang;
  route: string;
  studentNo?: string | null;
  mode?: 'live' | 'demo';
}

/* ------------------------------------------------------------------ *
 * Socket.IO event maps
 * ------------------------------------------------------------------ */

export interface ServerToClientEvents {
  'trip:update': (payload: TripUpdate) => void;
  'ui:island': (payload: IslandCommand) => void;
  'ui:aod': (payload: { enabled: boolean }) => void;
  'ui:notify': (payload: NotifyPayload) => void;
  'ui:haptic': (payload: { pattern: number[] }) => void;
  'ui:lang': (payload: { lang: Lang }) => void;
  'ui:burst': () => void;
  'demo:assigned': (payload: { sessionCode: string }) => void;
  'demo:controlled': (payload: { controlled: boolean }) => void;
  'admin:sessions': (payload: { sessions: DemoSession[] }) => void;
  'admin:event': (payload: { at: number; text: string }) => void;
}

export interface ClientToServerEvents {
  'demo:register': (payload: RegisterPayload, ack?: (r: { sessionCode: string }) => void) => void;
  'demo:heartbeat': (payload: { sessionCode: string; route?: string; mode?: 'live' | 'demo' }) => void;
  'track:subscribe': (
    payload: { studentNo: string },
    ack?: (r: { ok: boolean; trip?: TripUpdate; message?: string }) => void,
  ) => void;
  'track:unsubscribe': (payload: { studentNo: string }) => void;
  'admin:auth': (payload: { token: string }, ack?: (r: { ok: boolean }) => void) => void;
  'admin:command': (payload: AdminCommand, ack?: (r: { ok: boolean; message?: string }) => void) => void;
  'admin:watch': (payload: { sessionCode: string | null }) => void;
  /** Hands control of a session (or everyone) back to its own Demo Mode. */
  'admin:release': (payload: { target: 'all' | string }) => void;
}

/* ------------------------------------------------------------------ *
 * Small helpers shared by both sides
 * ------------------------------------------------------------------ */

export const STATE_TONE: Record<TripState, 'live' | 'soon' | 'late' | 'neutral'> = {
  idle: 'neutral',
  boarding: 'neutral',
  en_route: 'live',
  approaching: 'soon',
  arrived: 'live',
  delayed: 'late',
  stopped: 'late',
};

/** Hex accents, kept in sync with the Tailwind `darbi` palette. */
export const TONE_HEX: Record<'live' | 'soon' | 'late' | 'neutral', string> = {
  live: '#2E7D5B',
  soon: '#E08A1E',
  late: '#C0503C',
  neutral: '#C9A227',
};

export function stateAccent(state: TripState): string {
  return TONE_HEX[STATE_TONE[state]];
}

export function isTripState(value: unknown): value is TripState {
  return typeof value === 'string' && (TRIP_STATES as readonly string[]).includes(value);
}
