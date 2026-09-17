/**
 * Admin remote-control command handling (§8.2).
 *
 * Trip commands mutate the authoritative simulator; UI commands are forwarded to the
 * targeted socket(s) only. Everything is zod-validated — the console is the one place
 * in Darbi where a wrong payload could stall a live presentation.
 */
import { z } from 'zod';
import { isScenarioId } from '../../shared/scenarios';
import { ISLAND_MODES, LANGS, TRIP_STATES } from '../../shared/types';
import type { AdminCommand, DemoSession, TripState } from '../../shared/types';
import type { SessionRegistry } from './registry';
import { TripTicker, tripRoom, type DarbiServer } from './tripTicker';

/** Khalid's bus — used when the console is driven before any viewer has connected. */
const FALLBACK_BUS_ID = 'bus-3';

const seconds = z.object({ seconds: z.number().min(0).max(7200) });
const multiplier = z.object({ multiplier: z.number().min(0.1).max(60) });
const stopSeq = z.object({ seq: z.number().int().min(0).max(64) });
const stateSchema = z.object({ state: z.enum([...TRIP_STATES] as [TripState, ...TripState[]]) });
const scenarioSchema = z.object({ scenario: z.string().refine(isScenarioId, 'unknown scenario') });
const islandSchema = z.object({
  mode: z.enum([...ISLAND_MODES] as [(typeof ISLAND_MODES)[number], ...(typeof ISLAND_MODES)[number][]]),
  durationMs: z.number().min(0).max(120000).optional(),
});
const aodSchema = z.object({ enabled: z.boolean() });
const notifySchema = z.object({
  title_en: z.string().min(1).max(80),
  body_en: z.string().max(200).default(''),
  title_ar: z.string().min(1).max(80),
  body_ar: z.string().max(200).default(''),
  kind: z.enum(['info', 'warn', 'success']).default('info'),
});
const hapticSchema = z.object({ pattern: z.array(z.number().min(0).max(2000)).min(1).max(12) });
const langSchema = z.object({ lang: z.enum([...LANGS] as ['ar', 'en']) });

export interface AdminContext {
  io: DarbiServer;
  ticker: TripTicker;
  registry: SessionRegistry;
}

export interface CommandResult {
  ok: boolean;
  message: string;
}

function parse<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  return schema.parse(payload ?? {});
}

export function applyAdminCommand(command: AdminCommand, ctx: AdminContext): CommandResult {
  const { registry, ticker, io } = ctx;

  const sessions: DemoSession[] =
    command.target === 'all'
      ? registry.list()
      : [registry.get(command.target)].filter((s): s is DemoSession => Boolean(s));

  if (command.target !== 'all' && sessions.length === 0) {
    return { ok: false, message: `Session ${command.target} is not connected` };
  }

  const payload = command.payload ?? {};
  const isUi = command.command.startsWith('ui:');

  try {
    if (isUi) {
      const targets = sessions.map((s) => s.socketId);
      if (targets.length === 0) return { ok: false, message: 'No viewers connected' };
      registry.setControlled(sessions.map((s) => s.sessionCode), true);

      switch (command.command) {
        case 'ui:island': {
          const data = parse(islandSchema, payload);
          for (const id of targets) io.to(id).emit('ui:island', data);
          return { ok: true, message: `Island → ${data.mode}` };
        }
        case 'ui:aod': {
          const data = parse(aodSchema, payload);
          for (const id of targets) io.to(id).emit('ui:aod', data);
          return { ok: true, message: `AOD ${data.enabled ? 'on' : 'off'}` };
        }
        case 'ui:notify': {
          const data = parse(notifySchema, payload);
          for (const id of targets) io.to(id).emit('ui:notify', data);
          return { ok: true, message: 'Notification pushed' };
        }
        case 'ui:haptic': {
          const data = parse(hapticSchema, payload);
          for (const id of targets) io.to(id).emit('ui:haptic', data);
          return { ok: true, message: 'Haptic sent' };
        }
        case 'ui:lang': {
          const data = parse(langSchema, payload);
          for (const id of targets) io.to(id).emit('ui:lang', data);
          registry.setControlled(sessions.map((s) => s.sessionCode), true);
          for (const session of sessions) registry.patch(session.sessionCode, { lang: data.lang });
          return { ok: true, message: `Language → ${data.lang}` };
        }
        case 'ui:burst': {
          for (const id of targets) io.to(id).emit('ui:burst');
          return { ok: true, message: 'Arrival burst fired' };
        }
        default:
          return { ok: false, message: `Unknown UI command ${command.command}` };
      }
    }

    /* ---- trip commands ------------------------------------------- */

    const tripIds = new Set<string>();
    for (const session of sessions) if (session.tripId) tripIds.add(session.tripId);
    if (tripIds.size === 0) {
      const fallback = ticker.getByBus(FALLBACK_BUS_ID);
      if (fallback) tripIds.add(fallback.id);
    }
    if (tripIds.size === 0) return { ok: false, message: 'No trip available' };

    let message: string = command.command;
    for (const tripId of tripIds) {
      const trip = ticker.get(tripId);
      if (!trip) continue;
      const sim = trip.sim;

      switch (command.command) {
        case 'trip:start':
          ticker.clearScenario(tripId);
          sim.start();
          message = 'Trip started';
          break;
        case 'trip:pause':
          sim.pause();
          message = 'Trip paused';
          break;
        case 'trip:resume':
          sim.resume();
          message = 'Trip resumed';
          break;
        case 'trip:reset':
          ticker.clearScenario(tripId);
          sim.reset();
          message = 'Trip reset';
          break;
        case 'trip:setEta': {
          const data = parse(seconds, payload);
          sim.setEta(data.seconds);
          message = `ETA set to ${Math.round(data.seconds / 60)} min`;
          break;
        }
        case 'trip:setSpeed': {
          const data = parse(multiplier, payload);
          sim.setSpeedMultiplier(data.multiplier);
          message = `Speed ${data.multiplier}x`;
          break;
        }
        case 'trip:nextStop':
          sim.nextStop();
          message = 'Skipped to next stop';
          break;
        case 'trip:jumpToStop': {
          const data = parse(stopSeq, payload);
          sim.jumpToStop(data.seq);
          message = `Jumped to stop ${data.seq}`;
          break;
        }
        case 'trip:arriveNow':
          sim.arriveNow();
          io.to(tripRoom(tripId)).emit('ui:burst');
          message = 'Arrived';
          break;
        case 'trip:setState': {
          const data = parse(stateSchema, payload);
          sim.setState(data.state);
          message = `State → ${data.state}`;
          break;
        }
        case 'trip:setDelay': {
          const data = parse(seconds, payload);
          sim.setDelay(data.seconds);
          message = data.seconds > 0 ? `Delayed by ${Math.round(data.seconds / 60)} min` : 'Delay cleared';
          break;
        }
        case 'trip:scenario': {
          const data = parse(scenarioSchema, payload);
          sim.reset();
          ticker.runScenario(tripId, data.scenario as Parameters<TripTicker['runScenario']>[1]);
          message = `Scenario → ${data.scenario}`;
          break;
        }
        default:
          return { ok: false, message: `Unknown command ${command.command}` };
      }
    }

    if (sessions.length) registry.setControlled(sessions.map((s) => s.sessionCode), true);
    return { ok: true, message };
  } catch (error) {
    const detail = error instanceof z.ZodError ? error.issues.map((i) => i.message).join(', ') : String(error);
    return { ok: false, message: `Invalid payload: ${detail}` };
  }
}
