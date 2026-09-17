/**
 * The always-on display (§7).
 *
 * OLED-safe by construction: pure black, nothing brighter than 86% white, accents
 * desaturated, the content block drifting every minute, and a refresh cadence of once a
 * minute until the final 60 seconds. It also holds a screen wake lock while mounted.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackPayload, TripUpdate } from '@shared/types';
import { ArrivalBurst } from '@/components/island/ArrivalBurst';
import { useIslandView } from '@/components/island/useIslandView';
import { AOD_DIM, AOD_FAINT, AOD_WHITE } from '@/lib/color';
import { bilingualDate, clockTime } from '@/lib/format';
import { releaseWakeLock, requestWakeLock, watchVisibility } from '@/lib/wakeLock';
import { BurnInShifter } from './BurnInShifter';
import { AodCard } from './AodCard';

export interface LockScreenProps {
  trip: TripUpdate;
  payload: TrackPayload;
  reduceMotion?: boolean;
  /** Small render for the admin console's mirror. */
  compact?: boolean;
  interactive?: boolean;
  burst?: boolean;
  onUnlock?: () => void;
}

/** Snapshot ETA + clock on the AOD cadence rather than on every frame (§7.2). */
function useAodCadence(trip: TripUpdate): { eta: number; clock: Date } {
  const tripRef = useRef(trip);
  tripRef.current = trip;
  const finalMinute = trip.eta_seconds <= 60;
  const [snapshot, setSnapshot] = useState({ eta: trip.eta_seconds, clock: new Date() });

  useEffect(() => {
    const sample = (): void => setSnapshot({ eta: tripRef.current.eta_seconds, clock: new Date() });
    sample();
    const timer = window.setInterval(sample, finalMinute ? 1000 : 60000);
    return () => window.clearInterval(timer);
  }, [finalMinute]);

  // An arrival must never wait up to a minute to show.
  useEffect(() => {
    if (trip.state === 'arrived') setSnapshot({ eta: 0, clock: new Date() });
  }, [trip.state]);

  return snapshot;
}

export function LockScreen({
  trip,
  payload,
  reduceMotion = false,
  compact = false,
  interactive = true,
  burst = false,
  onUnlock,
}: LockScreenProps) {
  const { t, i18n } = useTranslation();
  const view = useIslandView(trip, payload);
  const { eta, clock } = useAodCadence(trip);
  const baseline = useRef(Math.max(60, trip.eta_seconds));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  if (trip.eta_seconds > baseline.current) baseline.current = trip.eta_seconds;

  /* Wake lock (§7.2) — failures are swallowed on purpose. */
  useEffect(() => {
    if (!interactive) return;
    void requestWakeLock();
    const stopWatching = watchVisibility();
    return () => {
      stopWatching();
      void releaseWakeLock();
    };
  }, [interactive]);

  useEffect(() => {
    if (!interactive) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onUnlock?.();
    };
    const onFullscreenChange = (): void => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [interactive, onUnlock]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  if (!view) return null;
  const date = bilingualDate(clock);
  const studentName = lang === 'ar' ? payload.student.name_ar : payload.student.name_en;

  return (
    <motion.div
      className="darbi-aod relative flex h-full w-full select-none flex-col items-center justify-between overflow-hidden"
      drag={interactive ? 'y' : false}
      dragConstraints={{ top: -240, bottom: 0 }}
      dragElastic={0.18}
      dragSnapToOrigin
      onDragEnd={(_event, info) => {
        if (info.offset.y < -120) onUnlock?.();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <BurnInShifter
        enabled={!reduceMotion}
        className={`flex w-full flex-1 flex-col items-center ${compact ? 'gap-2 px-3 pt-6' : 'gap-4 px-5 pt-14'}`}
      >
        <Lock size={compact ? 9 : 12} strokeWidth={1.75} style={{ color: AOD_FAINT }} aria-hidden />

        <div className="flex flex-col items-center">
          <span
            className="tabnum leading-none"
            style={{ color: AOD_WHITE, fontSize: compact ? 38 : 82, fontWeight: 200, letterSpacing: '-0.02em' }}
          >
            {clockTime(clock, lang)}
          </span>
          <span
            className={`mt-2 text-center ${compact ? 'text-[8px]' : 'text-sm'}`}
            style={{ color: AOD_DIM }}
          >
            {date.en} · <span dir="rtl">{date.ar}</span>
          </span>
        </div>

        <div className={`relative w-[92%] ${compact ? 'mt-1' : 'mt-4'}`}>
          <AodCard
            view={view}
            trip={trip}
            stops={payload.stops}
            studentName={studentName}
            displayEta={eta}
            etaBaseline={baseline.current}
            reduceMotion={reduceMotion}
            compact={compact}
          />
          <AnimatePresence>
            {burst ? (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <ArrivalBurst reduceMotion={reduceMotion} radius={compact ? 26 : 52} />
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </BurnInShifter>

      <div className={`flex w-full flex-col items-center ${compact ? 'gap-1 pb-3' : 'gap-3 pb-8'}`}>
        {interactive && !compact ? (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
            style={{ color: AOD_DIM, background: 'rgba(255,255,255,0.05)' }}
          >
            {isFullscreen ? <Minimize2 size={12} aria-hidden /> : <Maximize2 size={12} aria-hidden />}
            {isFullscreen ? t('aod.exitFullscreen') : t('aod.fullscreen')}
          </button>
        ) : null}

        <button
          type="button"
          onClick={interactive ? onUnlock : undefined}
          className="flex flex-col items-center gap-1"
          style={{ color: AOD_DIM }}
          aria-label={t('aod.swipeToUnlock')}
        >
          <motion.span
            animate={reduceMotion ? { y: 0 } : { y: [0, -4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronUp size={compact ? 12 : 18} strokeWidth={1.75} aria-hidden />
          </motion.span>
          <span className={compact ? 'text-[7px]' : 'text-[11px]'}>
            <span dir="rtl">اسحب للفتح</span> · {t('aod.swipeToUnlock')}
          </span>
        </button>
        <span className="h-1 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} aria-hidden />
      </div>
    </motion.div>
  );
}
