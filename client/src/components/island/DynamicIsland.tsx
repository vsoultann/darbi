/**
 * The Dynamic Island controller (§6).
 *
 * Owns mode, timers, gestures and the arrival burst, then hands rendering to whichever
 * shell fits the device: the floating pill (Dynamic Island iPhones, Android, desktop)
 * or the notch shell (iPhone X–14). Pass `mode` to drive it from outside — that is how
 * the admin console's live mirror renders the same component without timers.
 */
import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { IslandMode, TrackPayload, TripUpdate } from '@shared/types';
import { HAPTIC, vibrate } from '@/lib/haptics';
import { useDeviceChrome } from '@/lib/useDeviceChrome';
import { prefersReducedMotion, useSettings } from '@/store/settingsStore';
import { useTrip } from '@/store/tripStore';
import { DeviceFrame } from '@/components/shared/DeviceFrame';
import { ArrivalBurst } from './ArrivalBurst';
import { IslandCompact } from './IslandCompact';
import { IslandExpanded } from './IslandExpanded';
import { IslandMinimal } from './IslandMinimal';
import { IslandShell } from './IslandShell';
import { NotchShell } from './NotchShell';
import { useIslandView } from './useIslandView';

export interface DynamicIslandProps {
  /** Controlled data — omit to read the live store. */
  trip?: TripUpdate | null;
  payload?: TrackPayload | null;
  /** Controlled mode — omit to let the island manage itself. */
  mode?: IslandMode;
  /** Render inline instead of pinned to the viewport (used by the admin mirror). */
  embedded?: boolean;
  interactive?: boolean;
  /** Force a device chrome, ignoring detection and settings. */
  forceChrome?: 'island' | 'notch' | 'plain';
}

export function DynamicIsland({
  trip: tripProp,
  payload: payloadProp,
  mode: modeProp,
  embedded = false,
  interactive,
  forceChrome,
}: DynamicIslandProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const storeTrip = useTrip((state) => state.trip);
  const storePayload = useTrip((state) => state.payload);
  const storeMode = useTrip((state) => state.islandMode);
  const lastInteraction = useTrip((state) => state.lastInteraction);
  const lockedUntil = useTrip((state) => state.islandLockedUntil);
  const burstAt = useTrip((state) => state.burstAt);
  const setIslandMode = useTrip((state) => state.setIslandMode);
  const noteInteraction = useTrip((state) => state.noteInteraction);

  const reduceMotionSetting = useSettings((state) => state.reduceMotion);
  const reduceChrome = useSettings((state) => state.reduceChrome);
  const chromePreference = useSettings((state) => state.chrome);
  const demoShowIsland = useSettings((state) => state.demo.showIsland);
  const demoEnabled = useSettings((state) => state.demo.enabled);

  const controlled = modeProp !== undefined;
  const trip = tripProp ?? (controlled ? null : storeTrip);
  const payload = payloadProp ?? (controlled ? null : storePayload);
  const mode = modeProp ?? storeMode;
  const isInteractive = interactive ?? !controlled;

  const reduceMotion = reduceMotionSetting || prefersReducedMotion();
  const device = useDeviceChrome(forceChrome ?? chromePreference);
  const chromeKind = forceChrome ?? device.kind;

  const view = useIslandView(trip, payload);
  const [bursting, setBursting] = useState(false);
  const [maxWidth, setMaxWidth] = useState(360);
  const previous = useRef<{ state: string; seq: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const measure = (): void => setMaxWidth(Math.min(360, window.innerWidth - 24));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* Auto-expand on the moments that matter (§6.5). */
  useEffect(() => {
    if (controlled || !trip) return;
    const last = previous.current;
    previous.current = { state: trip.state, seq: trip.current_stop_seq };
    if (!last) return;

    const started = last.state === 'idle' && (trip.state === 'boarding' || trip.state === 'en_route');
    const notable =
      last.state !== trip.state && ['approaching', 'arrived', 'delayed', 'stopped'].includes(trip.state);
    const stopReached = last.seq !== trip.current_stop_seq;

    if (started || notable || stopReached) {
      setIslandMode('expanded', 5000);
      if (notable) vibrate(HAPTIC.expand);
    }
  }, [controlled, trip, setIslandMode]);

  /* Collapse ladder: expanded → compact after 5s idle, compact → minimal after 30s. */
  useEffect(() => {
    if (controlled || mode === 'minimal') return;
    const delay = mode === 'expanded' ? 5000 : 30000;
    const notBefore = Math.max(lastInteraction + delay, lockedUntil);
    const timer = window.setTimeout(
      () => setIslandMode(mode === 'expanded' ? 'compact' : 'minimal'),
      Math.max(300, notBefore - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [controlled, mode, lastInteraction, lockedUntil, setIslandMode]);

  /* Arrival burst (§6.3.7). */
  useEffect(() => {
    if (!burstAt || controlled) return;
    setBursting(true);
    vibrate(HAPTIC.arrive);
    setIslandMode('expanded', 4200);
    const timer = window.setTimeout(() => {
      setBursting(false);
      setIslandMode('minimal');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [burstAt, controlled, setIslandMode]);

  /* Tap outside collapses an expanded island (§6.3.10). */
  useEffect(() => {
    if (controlled || mode !== 'expanded') return;
    const onPointerDown = (event: PointerEvent): void => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setIslandMode('compact');
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [controlled, mode, setIslandMode]);

  const handleTap = useCallback(() => {
    noteInteraction();
    vibrate(HAPTIC.tap);
    setIslandMode(mode === 'expanded' ? 'compact' : 'expanded', mode === 'expanded' ? undefined : 8000);
  }, [mode, noteInteraction, setIslandMode]);

  const handleLongPress = useCallback(() => {
    if (!payload) return;
    vibrate(HAPTIC.expand);
    navigate(`/track/${payload.student.student_no}`);
  }, [navigate, payload]);

  const handleDismiss = useCallback(() => {
    vibrate(HAPTIC.tap);
    setIslandMode('minimal');
  }, [setIslandMode]);

  if (!view || !trip || !payload) return null;
  if (!controlled && (reduceChrome || (demoEnabled && !demoShowIsland))) return null;

  const speedKmh = trip.speed_kmh || 34;
  const content = (
    <AnimatePresence mode="popLayout" initial={false}>
      {mode === 'minimal' ? (
        <IslandMinimalWrapper key="minimal">
          <IslandMinimal view={view} reduceMotion={reduceMotion} />
        </IslandMinimalWrapper>
      ) : mode === 'compact' ? (
        <IslandMinimalWrapper key="compact">
          <IslandCompact view={view} reduceMotion={reduceMotion} speedKmh={speedKmh} />
        </IslandMinimalWrapper>
      ) : (
        <IslandMinimalWrapper key="expanded">
          <IslandExpanded
            view={view}
            stops={payload.stops}
            currentSeq={trip.current_stop_seq}
            reduceMotion={reduceMotion}
            speedKmh={speedKmh}
          />
        </IslandMinimalWrapper>
      )}
    </AnimatePresence>
  );

  const burstLayer = <AnimatePresence>{bursting ? <ArrivalBurst reduceMotion={reduceMotion} /> : null}</AnimatePresence>;

  const srSummary = `${view.headline}. ${view.stateLabel}. ${t('island.arrivingIn')} ${view.mmss}.`;

  if (chromeKind === 'notch') {
    const notch = (
      <div ref={containerRef} className="relative w-full">
        <NotchShell
          mode={mode}
          metrics={device.metrics}
          view={view}
          reduceMotion={reduceMotion}
          speedKmh={speedKmh}
          drawCutout={!device.isIPhoneDevice || Boolean(forceChrome)}
          interactive={isInteractive}
          onTap={isInteractive ? handleTap : undefined}
          onLongPress={isInteractive ? handleLongPress : undefined}
          onDismiss={isInteractive ? handleDismiss : undefined}
        >
          <div className="relative h-full w-full">
            <IslandExpanded
              view={view}
              stops={payload.stops}
              currentSeq={trip.current_stop_seq}
              reduceMotion={reduceMotion}
              speedKmh={speedKmh}
            />
            {burstLayer}
          </div>
        </NotchShell>
        <p className="sr-only" aria-live="polite">
          {srSummary}
        </p>
      </div>
    );
    if (embedded) return notch;
    return <div className="pointer-events-auto fixed inset-x-0 top-0 z-50">{notch}</div>;
  }

  const pill = (
    <div ref={containerRef} className="pointer-events-auto relative">
      <IslandShell
        mode={mode}
        reduceMotion={reduceMotion}
        accent={view.accent}
        pulse={view.approaching}
        interactive={isInteractive}
        maxWidth={embedded ? undefined : maxWidth}
        onTap={isInteractive ? handleTap : undefined}
        onLongPress={isInteractive ? handleLongPress : undefined}
        onDismiss={isInteractive ? handleDismiss : undefined}
      >
        {content}
        {burstLayer}
      </IslandShell>
      <p className="sr-only" aria-live="polite">
        {srSummary}
      </p>
    </div>
  );

  if (embedded) return pill;

  // Desktop has no notch to anchor to, so the pill is presented inside a device mock (§6.5).
  if (!device.isTouch) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
        <DeviceFrame variant="top">{pill}</DeviceFrame>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{ top: 'max(env(safe-area-inset-top, 0px), 8px)' }}
    >
      {pill}
    </div>
  );
}

/** Keeps every mode in one absolutely-positioned slot so AnimatePresence can swap them. */
function IslandMinimalWrapper({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0">{children}</div>;
}
