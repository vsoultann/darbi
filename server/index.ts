/**
 * Darbi server — one Node process, one port (§2).
 *
 * In production this serves the built React app AND the Socket.IO endpoint on
 * `process.env.PORT`, which is what Replit needs. In development Vite runs on 5173 and
 * proxies /api and /socket.io here.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { env } from './env';
import * as repo from './db/repo';
import { seed } from './seed/seed';
import { createAdminRouter } from './routes/admin';
import { createDriverRouter } from './routes/driver';
import { createStudentsRouter } from './routes/students';
import { createTripsRouter } from './routes/trips';
import { verifyToken } from './routes/auth';
import { ADMIN_ROOM, SessionRegistry } from './sockets/registry';
import { TripTicker, tripRoom, type DarbiServer } from './sockets/tripTicker';
import { applyAdminCommand } from './sockets/adminCommands';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types';

/* ---------------------------------------------------------------- *
 * Boot
 * ---------------------------------------------------------------- */

repo.getDb();
if (!repo.isSeeded()) {
  console.log('[darbi] empty database — seeding');
  seed();
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
if (!env.isProd) app.use(cors({ origin: true, credentials: true }));

const server = http.createServer(app);
const io: DarbiServer = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: env.isProd ? undefined : { origin: true, credentials: true },
  // Replit proxies WebSockets fine, but polling keeps a flaky venue network alive.
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 20000,
});

const ticker = new TripTicker(io);
const registry = new SessionRegistry(io);
ticker.start();

/* ---------------------------------------------------------------- *
 * HTTP API
 * ---------------------------------------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), trips: ticker.list().length, sessions: registry.list().length });
});

app.get('/api/routes', (_req, res) => {
  res.json({ school: repo.getSchool(), routes: repo.listRoutes(), buses: repo.listBuses() });
});

app.use('/api/students', createStudentsRouter(ticker));
app.use('/api/trips', createTripsRouter(ticker));
app.use('/api/admin', createAdminRouter(ticker, registry));
app.use('/api/driver', createDriverRouter(ticker));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

/* ---------------------------------------------------------------- *
 * Sockets (§8.3)
 * ---------------------------------------------------------------- */

io.on('connection', (socket) => {
  socket.data.isAdmin = false;

  socket.on('demo:register', (payload, ack) => {
    const session = registry.register(socket, payload ?? { label: '', userAgent: '', screen: '', lang: 'en', route: '/' });
    socket.emit('demo:assigned', { sessionCode: session.sessionCode });
    ack?.({ sessionCode: session.sessionCode });
  });

  socket.on('demo:heartbeat', (payload) => {
    if (!payload?.sessionCode) return;
    registry.heartbeat(payload.sessionCode, {
      route: payload.route,
      mode: payload.mode,
    });
  });

  socket.on('track:subscribe', (payload, ack) => {
    const student = payload?.studentNo ? repo.getStudentByNo(payload.studentNo) : null;
    if (!student) {
      ack?.({ ok: false, message: 'unknown_student' });
      return;
    }
    const trip = ticker.getByBus(student.bus_id);
    if (!trip) {
      ack?.({ ok: false, message: 'no_trip' });
      return;
    }
    for (const room of socket.rooms) if (room.startsWith('trip:')) socket.leave(room);
    socket.join(tripRoom(trip.id));

    const session = registry.bySocketId(socket.id);
    if (session) registry.patch(session.sessionCode, { studentNo: student.student_no, tripId: trip.id });

    ack?.({ ok: true, trip: trip.sim.toUpdate() });
    socket.emit('trip:update', trip.sim.toUpdate());
  });

  socket.on('track:unsubscribe', () => {
    for (const room of socket.rooms) if (room.startsWith('trip:')) socket.leave(room);
  });

  socket.on('admin:auth', (payload, ack) => {
    const decoded = payload?.token ? verifyToken(payload.token) : null;
    const ok = decoded?.role === 'admin';
    socket.data.isAdmin = ok;
    if (ok) {
      socket.join(ADMIN_ROOM);
      socket.emit('admin:sessions', { sessions: registry.list() });
    }
    ack?.({ ok });
  });

  socket.on('admin:command', (command, ack) => {
    if (!socket.data.isAdmin) {
      ack?.({ ok: false, message: 'unauthorized' });
      return;
    }
    const result = applyAdminCommand(command, { io, ticker, registry });
    registry.logToAdmins(`${command.target} · ${command.command} → ${result.message}`);
    ack?.(result);
  });

  socket.on('admin:watch', (payload) => {
    if (!socket.data.isAdmin) return;
    for (const room of socket.rooms) if (room.startsWith('trip:')) socket.leave(room);
    const session = payload?.sessionCode ? registry.get(payload.sessionCode) : null;
    const tripId = session?.tripId ?? ticker.getByBus('bus-3')?.id ?? null;
    if (tripId) {
      socket.join(tripRoom(tripId));
      const update = ticker.update(tripId);
      if (update) socket.emit('trip:update', update);
    }
  });

  socket.on('admin:release', (payload) => {
    if (!socket.data.isAdmin) return;
    const codes = payload?.target === 'all' ? registry.list().map((s) => s.sessionCode) : [payload.target];
    registry.setControlled(codes, false);
    registry.logToAdmins(`${payload?.target ?? 'all'} · control handed back`);
  });

  socket.on('disconnect', () => {
    registry.remove(socket.id);
  });
});

/* ---------------------------------------------------------------- *
 * Static SPA (production)
 * ---------------------------------------------------------------- */

if (env.isProd) {
  if (!fs.existsSync(env.clientDist)) {
    console.warn(`[darbi] ${env.clientDist} is missing — run "npm run build" before "npm start".`);
  }
  app.use(express.static(env.clientDist, { maxAge: '1h', index: false }));

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    // A missing hashed asset must 404, never fall through to index.html: answering a
    // module script with HTML is a MIME error that blanks the app after a redeploy.
    if (/\.[a-z0-9]{2,6}$/i.test(req.path)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const indexFile = path.join(env.clientDist, 'index.html');
    if (!fs.existsSync(indexFile)) {
      res.status(503).send('Client bundle missing. Run npm run build.');
      return;
    }
    // The shell names hashed assets, so it must never be cached itself.
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(indexFile);
  });
}

/* ---------------------------------------------------------------- *
 * Listen
 * ---------------------------------------------------------------- */

server.listen(env.port, env.host, () => {
  console.log(`[darbi] ${env.isProd ? 'production' : 'development'} server on http://${env.host}:${env.port}`);
  if (!env.isProd) console.log('[darbi] client dev server: http://localhost:5173');
});

function shutdown(signal: string): void {
  console.log(`[darbi] ${signal} — shutting down`);
  ticker.stop();
  io.close();
  server.close(() => {
    repo.closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
