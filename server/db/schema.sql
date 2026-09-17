-- Darbi schema (§4). SQLite today, MySQL tomorrow: every query lives in repo.ts.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schools (
  id        TEXT PRIMARY KEY,
  name_en   TEXT NOT NULL,
  name_ar   TEXT NOT NULL,
  emirate   TEXT NOT NULL,
  city_en   TEXT NOT NULL DEFAULT '',
  city_ar   TEXT NOT NULL DEFAULT '',
  lat       REAL NOT NULL,
  lng       REAL NOT NULL,
  logo_url  TEXT
);

CREATE TABLE IF NOT EXISTS routes (
  id         TEXT PRIMARY KEY,
  school_id  TEXT NOT NULL REFERENCES schools(id),
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  polyline   TEXT NOT NULL,              -- GeoJSON LineString, serialised
  direction  TEXT NOT NULL CHECK (direction IN ('morning','afternoon'))
);

CREATE TABLE IF NOT EXISTS stops (
  id            TEXT PRIMARY KEY,
  route_id      TEXT NOT NULL REFERENCES routes(id),
  seq           INTEGER NOT NULL,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  dwell_seconds INTEGER NOT NULL DEFAULT 30
);
CREATE INDEX IF NOT EXISTS idx_stops_route ON stops(route_id, seq);

CREATE TABLE IF NOT EXISTS drivers (
  id         TEXT PRIMARY KEY,
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  phone      TEXT NOT NULL,
  license_no TEXT NOT NULL,
  photo_url  TEXT
);

CREATE TABLE IF NOT EXISTS buses (
  id        TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  route_id  TEXT NOT NULL REFERENCES routes(id),
  plate     TEXT NOT NULL,
  capacity  INTEGER NOT NULL DEFAULT 32,
  driver_id TEXT REFERENCES drivers(id),
  status    TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS students (
  id             TEXT PRIMARY KEY,
  school_id      TEXT NOT NULL REFERENCES schools(id),
  name_en        TEXT NOT NULL,
  name_ar        TEXT NOT NULL,
  student_no     TEXT NOT NULL UNIQUE,   -- public lookup key
  grade          TEXT NOT NULL,
  bus_id         TEXT NOT NULL REFERENCES buses(id),
  stop_id        TEXT NOT NULL REFERENCES stops(id),
  guardian_phone TEXT NOT NULL,
  photo_url      TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_students_no ON students(student_no);

CREATE TABLE IF NOT EXISTS trips (
  id               TEXT PRIMARY KEY,
  bus_id           TEXT NOT NULL REFERENCES buses(id),
  route_id         TEXT NOT NULL REFERENCES routes(id),
  started_at       INTEGER,
  ended_at         INTEGER,
  state            TEXT NOT NULL DEFAULT 'idle',
  current_stop_seq INTEGER NOT NULL DEFAULT 0,
  progress         REAL NOT NULL DEFAULT 0,
  lat              REAL NOT NULL DEFAULT 0,
  lng              REAL NOT NULL DEFAULT 0,
  heading          REAL NOT NULL DEFAULT 0,
  speed_kmh        REAL NOT NULL DEFAULT 0,
  eta_seconds      INTEGER NOT NULL DEFAULT 0,
  delay_seconds    INTEGER NOT NULL DEFAULT 0,
  distance_m       INTEGER NOT NULL DEFAULT 0,
  updated_at       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trips_bus ON trips(bus_id);

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id      TEXT NOT NULL REFERENCES trips(id),
  type         TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_trip ON events(trip_id, id DESC);

CREATE TABLE IF NOT EXISTS demo_sessions (
  id         TEXT PRIMARY KEY,           -- session code, e.g. DRB-4K7X
  socket_id  TEXT NOT NULL,
  label      TEXT NOT NULL,
  device     TEXT NOT NULL,
  mode       TEXT NOT NULL DEFAULT 'live',
  scenario   TEXT,
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin'
);
