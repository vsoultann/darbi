/** Driver view backend: start/end a trip, mark a stop reached, report a delay (§5). */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env';
import * as repo from '../db/repo';
import { clearRateLimit, issueToken, rateLimit, requireRole, timingSafeEqual } from './auth';
import type { TripTicker } from '../sockets/tripTicker';

const loginSchema = z.object({ pin: z.string().min(3).max(24) });
const delaySchema = z.object({ minutes: z.number().min(0).max(60) });

export function createDriverRouter(ticker: TripTicker): Router {
  const router = Router();

  router.post('/login', rateLimit, (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input' });
      return;
    }
    const isDriver = timingSafeEqual(parsed.data.pin, env.driverPin);
    const isAdmin = timingSafeEqual(parsed.data.pin, env.adminPin);
    if (!isDriver && !isAdmin) {
      res.status(401).json({ error: 'bad_pin' });
      return;
    }
    clearRateLimit(req);
    res.json({ token: issueToken('driver'), role: 'driver', expiresIn: env.tokenTtl });
  });

  router.get('/buses', requireRole('driver', 'admin'), (_req, res) => {
    res.json({
      buses: repo.listBuses().map((bus) => {
        const route = repo.getRoute(bus.route_id);
        const trip = ticker.getByBus(bus.id);
        return {
          bus,
          driver: repo.getDriver(bus.driver_id),
          route: route ? { id: route.id, name_en: route.name_en, name_ar: route.name_ar } : null,
          stops: route ? repo.getStops(route.id) : [],
          students: repo.listStudentsOnBus(bus.id).length,
          update: trip?.sim.toUpdate() ?? null,
        };
      }),
    });
  });

  router.post('/buses/:busId/:action', requireRole('driver', 'admin'), (req, res) => {
    const trip = ticker.getByBus(String(req.params.busId));
    if (!trip) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const action = String(req.params.action);

    switch (action) {
      case 'start':
        ticker.clearScenario(trip.id);
        trip.sim.start();
        break;
      case 'end':
        trip.sim.arriveNow();
        break;
      case 'reset':
        ticker.clearScenario(trip.id);
        trip.sim.reset();
        break;
      case 'stop-reached':
        trip.sim.nextStop();
        break;
      case 'delay': {
        const parsed = delaySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'invalid_input' });
          return;
        }
        trip.sim.setDelay(parsed.data.minutes * 60);
        break;
      }
      default:
        res.status(400).json({ error: 'unknown_action' });
        return;
    }

    repo.insertEvent(trip.id, `driver:${action}`, req.body ?? {});
    res.json({ ok: true, update: trip.sim.toUpdate() });
  });

  return router;
}
