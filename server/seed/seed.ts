/**
 * Seeds darbi.db from the hand-written UAE data in routes.json / students.json (§10).
 *   npm run seed         idempotent top-up
 *   npm run seed:reset    wipes darbi.db first
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DB_PATH, closeDb, getDb, upsertAdmin } from '../db/repo';
import { env } from '../env';
import type { Bus, Driver, LineStringGeometry, RouteDirection, School, Stop, Student } from '../../shared/types';

const here = path.dirname(fileURLToPath(import.meta.url));

interface SeedRoute {
  id: string;
  school_id: string;
  name_en: string;
  name_ar: string;
  direction: RouteDirection;
  polyline: LineStringGeometry;
}
interface SeedFile {
  school: School & { city_en: string; city_ar: string };
  routes: SeedRoute[];
  stops: Stop[];
  drivers: Driver[];
  buses: Bus[];
}
type SeedStudent = Student & { demo: boolean };

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(here, file), 'utf8')) as T;
}

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(secret, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function seed(): void {
  const data = read<SeedFile>('routes.json');
  const students = read<SeedStudent[]>('students.json');
  const db = getDb();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO schools (id, name_en, name_ar, emirate, city_en, city_ar, lat, lng, logo_url)
       VALUES (@id, @name_en, @name_ar, @emirate, @city_en, @city_ar, @lat, @lng, @logo_url)
       ON CONFLICT(id) DO UPDATE SET name_en = excluded.name_en, name_ar = excluded.name_ar`,
    ).run(data.school);

    const routeStmt = db.prepare(
      `INSERT INTO routes (id, school_id, name_en, name_ar, polyline, direction)
       VALUES (@id, @school_id, @name_en, @name_ar, @polyline, @direction)
       ON CONFLICT(id) DO UPDATE SET polyline = excluded.polyline, name_en = excluded.name_en`,
    );
    for (const route of data.routes) {
      routeStmt.run({ ...route, polyline: JSON.stringify(route.polyline) });
    }

    const stopStmt = db.prepare(
      `INSERT INTO stops (id, route_id, seq, name_en, name_ar, lat, lng, dwell_seconds)
       VALUES (@id, @route_id, @seq, @name_en, @name_ar, @lat, @lng, @dwell_seconds)
       ON CONFLICT(id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, seq = excluded.seq`,
    );
    for (const stop of data.stops) stopStmt.run(stop);

    const driverStmt = db.prepare(
      `INSERT INTO drivers (id, name_en, name_ar, phone, license_no, photo_url)
       VALUES (@id, @name_en, @name_ar, @phone, @license_no, @photo_url)
       ON CONFLICT(id) DO UPDATE SET name_en = excluded.name_en`,
    );
    for (const driver of data.drivers) driverStmt.run(driver);

    const busStmt = db.prepare(
      `INSERT INTO buses (id, school_id, route_id, plate, capacity, driver_id, status)
       VALUES (@id, @school_id, @route_id, @plate, @capacity, @driver_id, @status)
       ON CONFLICT(id) DO UPDATE SET route_id = excluded.route_id, plate = excluded.plate`,
    );
    for (const bus of data.buses) busStmt.run(bus);

    const studentStmt = db.prepare(
      `INSERT INTO students (id, school_id, name_en, name_ar, student_no, grade, bus_id, stop_id, guardian_phone, photo_url, is_demo)
       VALUES (@id, @school_id, @name_en, @name_ar, @student_no, @grade, @bus_id, @stop_id, @guardian_phone, @photo_url, @is_demo)
       ON CONFLICT(id) DO UPDATE SET bus_id = excluded.bus_id, stop_id = excluded.stop_id, is_demo = excluded.is_demo`,
    );
    for (const student of students) {
      const { demo, ...rest } = student;
      studentStmt.run({ ...rest, is_demo: demo ? 1 : 0 });
    }

    // One standing trip per bus; the ticker hydrates these on boot.
    const tripStmt = db.prepare(
      `INSERT OR IGNORE INTO trips (id, bus_id, route_id, state, updated_at) VALUES (?, ?, ?, 'idle', ?)`,
    );
    for (const bus of data.buses) tripStmt.run(`trip-${bus.id}`, bus.id, bus.route_id, Date.now());
  });

  tx();

  upsertAdmin({
    id: 'admin-1',
    username: 'admin',
    password_hash: hashSecret(env.adminPin),
    role: 'admin',
  });
  upsertAdmin({
    id: 'driver-login-1',
    username: 'driver',
    password_hash: hashSecret(env.driverPin),
    role: 'driver',
  });

  const counts = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM routes) AS routes,
              (SELECT COUNT(*) FROM stops) AS stops,
              (SELECT COUNT(*) FROM buses) AS buses,
              (SELECT COUNT(*) FROM students) AS students,
              (SELECT COUNT(*) FROM trips) AS trips`,
    )
    .get();
  console.log('[darbi] seeded', counts);
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  if (process.env.DARBI_RESET === '1') {
    closeDb();
    for (const suffix of ['', '-wal', '-shm']) {
      const file = `${DB_PATH}${suffix}`;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
    console.log('[darbi] database reset');
  }
  seed();
  closeDb();
}
