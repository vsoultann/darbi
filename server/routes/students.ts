/** Public, login-free student lookup — the whole parent flow hangs off this (§1). */
import { Router } from 'express';
import { z } from 'zod';
import * as repo from '../db/repo';
import type { TrackPayload } from '../../shared/types';
import type { TripTicker } from '../sockets/tripTicker';

const lookupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  studentNo: z.string().trim().min(3).max(24),
});

/** Loose match: either language, either direction, so parents are not punished for spelling. */
function nameMatches(input: string, en: string, ar: string): boolean {
  const norm = (value: string) =>
    value
      .toLocaleLowerCase('en')
      .replace(/[ً-ْـ]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();
  const needle = norm(input);
  const haystacks = [norm(en), norm(ar)];
  return haystacks.some((h) => h === needle || h.includes(needle) || needle.includes(h.split(' ')[0]));
}

export function buildTrackPayload(studentNo: string, ticker: TripTicker): TrackPayload | null {
  const student = repo.getStudentByNo(studentNo);
  if (!student) return null;
  const bus = repo.getBus(student.bus_id);
  if (!bus) return null;
  const route = repo.getRoute(bus.route_id);
  if (!route) return null;
  const school = repo.getSchool(student.school_id);
  if (!school) return null;

  const active = ticker.getByBus(bus.id);
  if (!active) return null;

  return {
    school,
    student,
    bus,
    driver: repo.getDriver(bus.driver_id),
    route,
    stops: repo.getStops(route.id),
    trip: active.sim.toUpdate(),
  };
}

export function createStudentsRouter(ticker: TripTicker): Router {
  const router = Router();

  // Landing form: name + ID must agree before we hand out a tracking link.
  router.post('/lookup', (req, res) => {
    const parsed = lookupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input' });
      return;
    }
    const student = repo.getStudentByNo(parsed.data.studentNo);
    if (!student) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (!nameMatches(parsed.data.name, student.name_en, student.name_ar)) {
      res.status(403).json({ error: 'name_mismatch' });
      return;
    }
    res.json({ ok: true, studentNo: student.student_no });
  });

  router.get('/demo', (_req, res) => {
    res.json({
      students: repo.listDemoStudents().map((s) => ({
        student_no: s.student_no,
        name_en: s.name_en,
        name_ar: s.name_ar,
        bus_id: s.bus_id,
        grade: s.grade,
      })),
    });
  });

  router.get('/:studentNo', (req, res) => {
    const payload = buildTrackPayload(String(req.params.studentNo), ticker);
    if (!payload) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(payload);
  });

  return router;
}
