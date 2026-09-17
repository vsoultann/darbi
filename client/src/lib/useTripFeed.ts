/**
 * Wires a TripSource into the store (§9).
 *
 * The socket source always runs — it is what registers this screen in the admin console
 * and carries remote commands. The DemoEngine runs *in addition* when Demo Mode is on,
 * and its frames take over unless an admin is actively driving this session, at which
 * point control passes back to the server feed and returns when the admin releases it.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang, TrackPayload, TripUpdate } from '@shared/types';
import { api, ApiError } from '@/lib/api';
import { DEMO_ONLY } from '@/lib/env';
import { applyDirection } from '@/i18n';
import { vibrate } from '@/lib/haptics';
import { DemoTripSource, SocketTripSource, type TripSourceHandlers } from '@/demo/TripSource';
import type { DemoEngine } from '@/demo/DemoEngine';
import { fallbackPayloadFor } from '@/demo/fallbackPayload';
import { setActiveEngine } from '@/demo/activeEngine';
import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useToasts } from '@/store/toastStore';
import { useTrip } from '@/store/tripStore';

export interface TripFeedState {
  payload: TrackPayload | null;
  loading: boolean;
  error: 'not_found' | 'offline' | null;
  offlineFallback: boolean;
}

export function useTripFeed(studentNo: string | undefined): TripFeedState {
  const { i18n } = useTranslation();
  const [state, setState] = useState<TripFeedState>({
    payload: null,
    loading: true,
    error: null,
    offlineFallback: false,
  });

  const setPayload = useTrip((s) => s.setPayload);
  const applyUpdate = useTrip((s) => s.applyUpdate);
  const setConnected = useTrip((s) => s.setConnected);
  const setControlled = useTrip((s) => s.setControlled);
  const setIslandMode = useTrip((s) => s.setIslandMode);
  const requestAod = useTrip((s) => s.requestAod);
  const fireBurst = useTrip((s) => s.fireBurst);

  const setSessionCode = useSession((s) => s.setSessionCode);
  const pushToast = useToasts((s) => s.push);
  const settings = useSettings();

  const controlled = useTrip((s) => s.controlled);
  const demo = settings.demo;
  const demoActive = (demo.enabled || DEMO_ONLY) && !controlled;

  const lastState = useRef<string | null>(null);
  const demoSource = useRef<DemoTripSource | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /* 1 — the static context (student, bus, route, stops). */
  useEffect(() => {
    if (!studentNo) return;
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    if (DEMO_ONLY) {
      const bundled = fallbackPayloadFor(studentNo) ?? fallbackPayloadFor('123456');
      if (bundled) {
        setPayload(bundled);
        setState({ payload: bundled, loading: false, error: null, offlineFallback: true });
      } else {
        setState({ payload: null, loading: false, error: 'not_found', offlineFallback: false });
      }
      return;
    }

    api
      .track(studentNo)
      .then((payload) => {
        if (cancelled) return;
        setPayload(payload);
        setState({ payload, loading: false, error: null, offlineFallback: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const offline = error instanceof ApiError && error.status === 0;
        const fallback = offline ? fallbackPayloadFor(studentNo) : null;
        if (fallback) {
          setPayload(fallback);
          setState({ payload: fallback, loading: false, error: null, offlineFallback: true });
          return;
        }
        setState({ payload: null, loading: false, error: offline ? 'offline' : 'not_found', offlineFallback: false });
      });

    return () => {
      cancelled = true;
    };
  }, [studentNo, setPayload]);

  /* 2 — one shared handler set, reading the latest settings through a ref. */
  const handlersRef = useRef<TripSourceHandlers>({ onUpdate: () => undefined });
  handlersRef.current = {
    onUpdate: (update: TripUpdate) => {
      applyUpdate(update, update.simulated ? 'demo' : 'socket');
      if (update.state === 'arrived' && lastState.current !== 'arrived') fireBurst();
      lastState.current = update.state;
    },
    onIsland: (command) => setIslandMode(command.mode, command.durationMs),
    onNotify: (payload) => {
      if (settingsRef.current.notifications) pushToast(payload);
    },
    onHaptic: (pattern) => {
      if (settingsRef.current.haptics) vibrate(pattern);
    },
    onLang: (lang: Lang) => {
      settingsRef.current.setLang(lang);
      void i18n.changeLanguage(lang);
      applyDirection(lang);
    },
    onBurst: () => fireBurst(),
    onAod: (enabled) => requestAod(enabled),
    onConnection: (connected) => setConnected(connected),
    onControlled: (value) => setControlled(value),
    onSession: (code) => setSessionCode(code),
  };

  /* 3 — the socket source: always on, so this screen is remotely controllable. */
  useEffect(() => {
    if (!studentNo || !state.payload || DEMO_ONLY) return;
    const source = new SocketTripSource({
      studentNo,
      lang: settingsRef.current.lang,
      route: window.location.pathname,
      demoMode: settingsRef.current.demo.enabled,
    });
    source.start({
      onUpdate: (update) => {
        // While the local demo is driving, server frames are ignored (but UI commands are not).
        if (settingsRef.current.demo.enabled && !useTrip.getState().controlled) return;
        handlersRef.current.onUpdate(update);
      },
      onIsland: (command) => handlersRef.current.onIsland?.(command),
      onNotify: (payload) => handlersRef.current.onNotify?.(payload),
      onHaptic: (pattern) => handlersRef.current.onHaptic?.(pattern),
      onLang: (lang) => handlersRef.current.onLang?.(lang),
      onBurst: () => handlersRef.current.onBurst?.(),
      onAod: (enabled) => handlersRef.current.onAod?.(enabled),
      onConnection: (connected) => handlersRef.current.onConnection?.(connected),
      onControlled: (value) => handlersRef.current.onControlled?.(value),
      onSession: (code) => handlersRef.current.onSession?.(code),
    });
    return () => source.stop();
  }, [studentNo, state.payload]);

  /* 4 — the DemoEngine, rebuilt when the scenario or the student changes. */
  useEffect(() => {
    if (!state.payload || !demoActive) {
      demoSource.current?.stop();
      demoSource.current = null;
      return;
    }
    const source = new DemoTripSource({
      payload: state.payload,
      scenario: demo.scenario,
      speed: demo.speed,
      autoLoop: demo.autoLoop,
    });
    source.start({
      onUpdate: (update) => handlersRef.current.onUpdate(update),
      onIsland: (command) => handlersRef.current.onIsland?.(command),
      onNotify: (payload) => {
        if (settingsRef.current.demo.notifPreviews) handlersRef.current.onNotify?.(payload);
      },
      onHaptic: (pattern) => {
        if (settingsRef.current.demo.haptics) handlersRef.current.onHaptic?.(pattern);
      },
      onConnection: () => undefined,
    });
    demoSource.current = source;
    setActiveEngine(source.instance);
    return () => {
      source.stop();
      demoSource.current = null;
      setActiveEngine(null);
    };
  }, [state.payload, demoActive, demo.scenario]);

  /* 5 — live-apply the cheap demo knobs without restarting the journey. */
  useEffect(() => {
    const engine: DemoEngine | null = demoSource.current?.instance ?? null;
    engine?.setSpeed(demo.speed);
  }, [demo.speed]);

  useEffect(() => {
    const engine: DemoEngine | null = demoSource.current?.instance ?? null;
    engine?.setAutoLoop(demo.autoLoop);
  }, [demo.autoLoop]);

  return state;
}
