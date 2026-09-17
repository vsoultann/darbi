/**
 * TripSource — the seam that makes Demo Mode invisible to the UI (§9).
 *
 * `SocketTripSource` streams the authoritative server feed; `DemoTripSource` produces
 * byte-identical frames from a simulator running in this tab. Components upstream of
 * this interface never learn which one is talking.
 */
import type { IslandCommand, Lang, NotifyPayload, TrackPayload, TripUpdate } from '@shared/types';
import { deviceLabel } from '@/lib/device';
import { getSocket } from '@/lib/socket';
import { DemoEngine, type DemoEngineOptions } from './DemoEngine';

export interface TripSourceHandlers {
  onUpdate: (update: TripUpdate) => void;
  onIsland?: (command: IslandCommand) => void;
  onNotify?: (payload: NotifyPayload) => void;
  onHaptic?: (pattern: number[]) => void;
  onLang?: (lang: Lang) => void;
  onBurst?: () => void;
  onAod?: (enabled: boolean) => void;
  onConnection?: (connected: boolean) => void;
  onControlled?: (controlled: boolean) => void;
  onSession?: (sessionCode: string) => void;
}

export interface TripSource {
  readonly kind: 'socket' | 'demo';
  start: (handlers: TripSourceHandlers) => void;
  stop: () => void;
}

export interface SocketSourceOptions {
  studentNo: string;
  lang: Lang;
  route: string;
  demoMode: boolean;
}

export class SocketTripSource implements TripSource {
  readonly kind = 'socket' as const;
  private detach: Array<() => void> = [];
  private heartbeat: number | null = null;
  private sessionCode: string | null = null;

  constructor(private options: SocketSourceOptions) {}

  start(handlers: TripSourceHandlers): void {
    const socket = getSocket();

    const register = (): void => {
      socket.emit(
        'demo:register',
        {
          label: deviceLabel(),
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}×${window.screen.height}`,
          lang: this.options.lang,
          route: this.options.route,
          studentNo: this.options.studentNo,
          mode: this.options.demoMode ? 'demo' : 'live',
        },
        (ack) => {
          this.sessionCode = ack.sessionCode;
          handlers.onSession?.(ack.sessionCode);
        },
      );
      socket.emit('track:subscribe', { studentNo: this.options.studentNo }, (ack) => {
        if (ack.ok && ack.trip) handlers.onUpdate(ack.trip);
      });
    };

    const onConnect = (): void => {
      handlers.onConnection?.(true);
      register();
    };
    const onDisconnect = (): void => handlers.onConnection?.(false);
    const onUpdate = (update: TripUpdate): void => handlers.onUpdate(update);
    const onIsland = (command: IslandCommand): void => handlers.onIsland?.(command);
    const onNotify = (payload: NotifyPayload): void => handlers.onNotify?.(payload);
    const onHaptic = (payload: { pattern: number[] }): void => handlers.onHaptic?.(payload.pattern);
    const onLang = (payload: { lang: Lang }): void => handlers.onLang?.(payload.lang);
    const onBurst = (): void => handlers.onBurst?.();
    const onAod = (payload: { enabled: boolean }): void => handlers.onAod?.(payload.enabled);
    const onAssigned = (payload: { sessionCode: string }): void => {
      this.sessionCode = payload.sessionCode;
      handlers.onSession?.(payload.sessionCode);
    };
    const onControlled = (payload: { controlled: boolean }): void => handlers.onControlled?.(payload.controlled);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('trip:update', onUpdate);
    socket.on('ui:island', onIsland);
    socket.on('ui:notify', onNotify);
    socket.on('ui:haptic', onHaptic);
    socket.on('ui:lang', onLang);
    socket.on('ui:burst', onBurst);
    socket.on('ui:aod', onAod);
    socket.on('demo:assigned', onAssigned);
    socket.on('demo:controlled', onControlled);

    this.detach.push(() => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('trip:update', onUpdate);
      socket.off('ui:island', onIsland);
      socket.off('ui:notify', onNotify);
      socket.off('ui:haptic', onHaptic);
      socket.off('ui:lang', onLang);
      socket.off('ui:burst', onBurst);
      socket.off('ui:aod', onAod);
      socket.off('demo:assigned', onAssigned);
      socket.off('demo:controlled', onControlled);
    });

    if (socket.connected) onConnect();
    else socket.connect();

    this.heartbeat = window.setInterval(() => {
      if (!this.sessionCode) return;
      socket.emit('demo:heartbeat', {
        sessionCode: this.sessionCode,
        route: window.location.pathname,
        mode: this.options.demoMode ? 'demo' : 'live',
      });
    }, 8000);
  }

  stop(): void {
    if (this.heartbeat) window.clearInterval(this.heartbeat);
    this.heartbeat = null;
    for (const off of this.detach) off();
    this.detach = [];
  }
}

export interface DemoSourceOptions extends Omit<DemoEngineOptions, 'onUpdate' | 'onAction'> {
  payload: TrackPayload;
}

export class DemoTripSource implements TripSource {
  readonly kind = 'demo' as const;
  private engine: DemoEngine | null = null;

  constructor(private options: DemoSourceOptions) {}

  start(handlers: TripSourceHandlers): void {
    this.engine = new DemoEngine({
      ...this.options,
      onUpdate: handlers.onUpdate,
      onAction: (action) => {
        if (action.kind === 'island') handlers.onIsland?.({ mode: action.mode, durationMs: action.durationMs });
        else if (action.kind === 'haptic') handlers.onHaptic?.(action.pattern);
        else if (action.kind === 'notify') {
          handlers.onNotify?.({
            title_en: action.title_en,
            body_en: action.body_en,
            title_ar: action.title_ar,
            body_ar: action.body_ar,
            kind: action.tone,
          });
        }
      },
    });
    this.engine.start();
    handlers.onConnection?.(true);
  }

  stop(): void {
    this.engine?.stop();
    this.engine = null;
  }

  get instance(): DemoEngine | null {
    return this.engine;
  }
}
