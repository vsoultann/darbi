/**
 * The only place in the server that talks to SQLite.
 *
 * Routes, sockets and the ticker call these functions and never see a SQL string,
 * so swapping better-sqlite3 for MySQL later is a single-file change (§2).
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import type { Database as Db } from 'better-sqlite3';
import { migrate } from './migrate';
import type {
  Bus,
  BusRoute,
  DemoSession,
  Driver,
  LineStringGeometry,
  School,
  Stop,
  Student,
  TripState,
} from '../../shared/types';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..', '..');
export const DB_PATH = process.env.DARBI_DB ?? path.join(ROOT_DIR, 'darbi.db');

let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}

/* ------------------------------------------------------------------ *
 * Row mappers — DB rows are flat, the shared types are not.
 * ------------------------------------------------------------------ */

interface RouteRow {
  id: string;
  school_id: string;
  name_en: string;
  name_ar: string;
  polyline: string;
  direction: string;
}

function toRoute(row: RouteRow): BusRoute {
  return {
    id: row.id,
    school_id: row.school_id,
    name_en: row.name_en,
    name_ar: row.name_ar,
    polyline: JSON.parse(row.polyline) as LineStringGeometry,
    direction: row.direction === 'afternoon' ? 'afternoon' : 'morning',
  };
}

interface StudentRow extends Omit<Student, 'photo_url'> {
  photo_url: string | null;
  is_demo: number;
}

function toStudent(row: StudentRow): Student & { is_demo: boolean } {
  return { ...row, is_demo: row.is_demo === 1 };
}

/* ------------------------------------------------------------------ *
 * Reference data
 * ------------------------------------------------------------------ */

export function getSchool(id?: string): School | null {
  const sql = id ? 'SELECT * FROM schools WHERE id = ?' : 'SELECT * FROM schools LIMIT 1';
  const row = (id ? getDb().prepare(sql).get(id) : getDb().prepare(sql).get()) as School | undefined;
  return row ?? null;
}

export function listRoutes(): BusRoute[] {
  return (getDb().prepare('SELECT * FROM routes ORDER BY name_en').all() as RouteRow[]).map(toRoute);
}

export function getRoute(id: string): BusRoute | null {
  const row = getDb().prepare('SELECT * FROM routes WHERE id = ?').get(id) as RouteRow | undefined;
  return row ? toRoute(row) : null;
}

export function getStops(routeId: string): Stop[] {
  return getDb().prepare('SELECT * FROM stops WHERE route_id = ? ORDER BY seq').all(routeId) as Stop[];
}

export function getStop(id: string): Stop | null {
  return (getDb().prepare('SELECT * FROM stops WHERE id = ?').get(id) as Stop | undefined) ?? null;
}

export function listBuses(): Bus[] {
  return getDb().prepare('SELECT * FROM buses ORDER BY id').all() as Bus[];
}

export function getBus(id: string): Bus | null {
  return (getDb().prepare('SELECT * FROM buses WHERE id = ?').get(id) as Bus | undefined) ?? null;
}

export function getDriver(id: string | null): Driver | null {
  if (!id) return null;
  return (getDb().prepare('SELECT * FROM drivers WHERE id = ?').get(id) as Driver | undefined) ?? null;
}

export function listDrivers(): Driver[] {
  return getDb().prepare('SELECT * FROM drivers ORDER BY name_en').all() as Driver[];
}

export function getStudentByNo(studentNo: string): (Student & { is_demo: boolean }) | null {
  const row = getDb().prepare('SELECT * FROM students WHERE student_no = ?').get(studentNo) as
    | StudentRow
    | undefined;
  return row ? toStudent(row) : null;
}

export function listStudents(): Array<Student & { is_demo: boolean }> {
  return (getDb().prepare('SELECT * FROM students ORDER BY name_en').all() as StudentRow[]).map(toStudent);
}

export function listDemoStudents(): Array<Student & { is_demo: boolean }> {
  return (
    getDb().prepare('SELECT * FROM students WHERE is_demo = 1 ORDER BY name_en').all() as StudentRow[]
  ).map(toStudent);
}

export function listStudentsOnBus(busId: string): Array<Student & { is_demo: boolean }> {
  return (
    getDb().prepare('SELECT * FROM students WHERE bus_id = ? ORDER BY name_en').all(busId) as StudentRow[]
  ).map(toStudent);
}

/* ------------------------------------------------------------------ *
 * Trips
 * ------------------------------------------------------------------ */

export interface TripRow {
  id: string;
  bus_id: string;
  route_id: string;
  started_at: number | null;
  ended_at: number | null;
  state: TripState;
  current_stop_seq: number;
  progress: number;
  lat: number;
  lng: number;
  heading: number;
  speed_kmh: number;
  eta_seconds: number;
  delay_seconds: number;
  distance_m: number;
  updated_at: number;
}

export function getTripByBus(busId: string): TripRow | null {
  return (
    (getDb()
      .prepare('SELECT * FROM trips WHERE bus_id = ? ORDER BY COALESCE(started_at, 0) DESC LIMIT 1')
      .get(busId) as TripRow | undefined) ?? null
  );
}

export function getTrip(id: string): TripRow | null {
  return (getDb().prepare('SELECT * FROM trips WHERE id = ?').get(id) as TripRow | undefined) ?? null;
}

export function createTrip(trip: Pick<TripRow, 'id' | 'bus_id' | 'route_id'>): TripRow {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO trips (id, bus_id, route_id, state, updated_at)
       VALUES (@id, @bus_id, @route_id, 'idle', @updated_at)`,
    )
    .run({ ...trip, updated_at: Date.now() });
  return getTrip(trip.id) as TripRow;
}

export function saveTripState(trip: Omit<TripRow, 'started_at' | 'ended_at'> & Partial<TripRow>): void {
  getDb()
    .prepare(
      `UPDATE trips SET
         state = @state,
         current_stop_seq = @current_stop_seq,
         progress = @progress,
         lat = @lat, lng = @lng, heading = @heading,
         speed_kmh = @speed_kmh,
         eta_seconds = @eta_seconds,
         delay_seconds = @delay_seconds,
         distance_m = @distance_m,
         started_at = COALESCE(@started_at, started_at),
         ended_at = @ended_at,
         updated_at = @updated_at
       WHERE id = @id`,
    )
    .run({
      started_at: null,
      ended_at: null,
      ...trip,
      updated_at: Date.now(),
    });
}

export function insertEvent(tripId: string, type: string, payload: unknown = {}): void {
  getDb()
    .prepare('INSERT INTO events (trip_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)')
    .run(tripId, type, JSON.stringify(payload ?? {}), Date.now());
}

export interface EventRow {
  id: number;
  trip_id: string;
  type: string;
  payload_json: string;
  created_at: number;
}

export function listEvents(tripId: string, limit = 40): EventRow[] {
  return getDb()
    .prepare('SELECT * FROM events WHERE trip_id = ? ORDER BY id DESC LIMIT ?')
    .all(tripId, limit) as EventRow[];
}

/* ------------------------------------------------------------------ *
 * Demo sessions (§8.1) — persisted so the admin console survives a reload.
 * ------------------------------------------------------------------ */

export function upsertDemoSession(session: DemoSession): void {
  getDb()
    .prepare(
      `INSERT INTO demo_sessions (id, socket_id, label, device, mode, scenario, created_at, last_seen)
       VALUES (@sessionCode, @socketId, @label, @device, @mode, @scenario, @createdAt, @lastSeen)
       ON CONFLICT(id) DO UPDATE SET
         socket_id = excluded.socket_id,
         label = excluded.label,
         device = excluded.device,
         mode = excluded.mode,
         scenario = excluded.scenario,
         last_seen = excluded.last_seen`,
    )
    .run({
      sessionCode: session.sessionCode,
      socketId: session.socketId,
      label: session.label,
      device: session.device,
      mode: session.mode,
      scenario: session.scenario,
      createdAt: session.createdAt,
      lastSeen: session.lastSeen,
    });
}

export function deleteDemoSession(sessionCode: string): void {
  getDb().prepare('DELETE FROM demo_sessions WHERE id = ?').run(sessionCode);
}

export function pruneDemoSessions(olderThanMs: number): void {
  getDb().prepare('DELETE FROM demo_sessions WHERE last_seen < ?').run(Date.now() - olderThanMs);
}

/* ------------------------------------------------------------------ *
 * Admins
 * ------------------------------------------------------------------ */

export interface AdminRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
}

export function getAdmin(username: string): AdminRow | null {
  return (
    (getDb().prepare('SELECT * FROM admins WHERE username = ?').get(username) as AdminRow | undefined) ?? null
  );
}

export function upsertAdmin(admin: AdminRow): void {
  getDb()
    .prepare(
      `INSERT INTO admins (id, username, password_hash, role) VALUES (@id, @username, @password_hash, @role)
       ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role`,
    )
    .run(admin);
}

export function isSeeded(): boolean {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM students').get() as { n: number };
  return row.n > 0;
}
