import { Router } from 'express';
import * as repo from '../db/repo';
import type { TripTicker } from '../sockets/tripTicker';

export function createTripsRouter(ticker: TripTicker): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      trips: ticker.list().map((trip) => ({
        id: trip.id,
        busId: trip.busId,
        routeId: trip.routeId,
        direction: trip.direction,
        scenario: trip.scenario,
        update: trip.sim.toUpdate(),
      })),
    });
  });

  router.get('/:tripId', (req, res) => {
    const trip = ticker.get(String(req.params.tripId));
    if (!trip) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ id: trip.id, scenario: trip.scenario, direction: trip.direction, update: trip.sim.toUpdate() });
  });

  router.get('/:tripId/events', (req, res) => {
    const events = repo.listEvents(String(req.params.tripId), 40).map((row) => ({
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload_json) as unknown,
      created_at: row.created_at,
    }));
    res.json({ events });
  });

  return router;
}
