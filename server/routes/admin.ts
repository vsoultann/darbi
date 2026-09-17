/** Admin PIN gate + dashboard data (§8.4). The PIN never reaches the client bundle. */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env';
import * as repo from '../db/repo';
import { clearRateLimit, issueToken, rateLimit, requireRole, timingSafeEqual } from './auth';
import type { SessionRegistry } from '../sockets/registry';
import type { TripTicker } from '../sockets/tripTicker';

const loginSchema = z.object({ pin: z.string().min(3).max(24) });

export function createAdminRouter(ticker: TripTicker, registry: SessionRegistry): Router {
  const router = Router();

  router.post('/login', rateLimit, (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input' });
      return;
    }
    if (!timingSafeEqual(parsed.data.pin, env.adminPin)) {
      res.status(401).json({ error: 'bad_pin' });
      return;
    }
    clearRateLimit(req);
    res.json({ token: issueToken('admin'), role: 'admin', expiresIn: env.tokenTtl });
  });

  router.get('/sessions', requireRole('admin'), (_req, res) => {
    res.json({ sessions: registry.list() });
  });

  router.get('/overview', requireRole('admin'), (_req, res) => {
    const buses = repo.listBuses().map((bus) => {
      const trip = ticker.getByBus(bus.id);
      const route = repo.getRoute(bus.route_id);
      return {
        bus,
        driver: repo.getDriver(bus.driver_id),
        route: route ? { id: route.id, name_en: route.name_en, name_ar: route.name_ar } : null,
        students: repo.listStudentsOnBus(bus.id).length,
        update: trip?.sim.toUpdate() ?? null,
        scenario: trip?.scenario ?? null,
      };
    });
    res.json({
      school: repo.getSchool(),
      buses,
      sessions: registry.list().length,
      students: repo.listStudents().length,
    });
  });

  return router;
}
