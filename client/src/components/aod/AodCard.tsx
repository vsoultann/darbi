/** The lock-screen live activity card (§7.1 row 4). Reuses the island's stop rail. */
import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Stop, TripUpdate } from '@shared/types';
import { StopRail } from '@/components/shared/StopRail';
import { AOD_DIM, AOD_WHITE, aodAccent } from '@/lib/color';
import { arrivalClock, etaMinutes, formatMmSs } from '@/lib/format';
import type { IslandView } from '@/components/island/useIslandView';
import { CountdownRing } from './CountdownRing';

export interface AodCardProps {
  view: IslandView;
  trip: TripUpdate;
  stops: Stop[];
  studentName: string;
  /** Snapshotted ETA — the AOD refreshes once a minute, not four times a second. */
  displayEta: number;
  /** ETA at the moment the ring was last reset, used for the fill fraction. */
  etaBaseline: number;
  reduceMotion?: boolean;
  compact?: boolean;
}

export function AodCard({
  view,
  trip,
  stops,
  studentName,
  displayEta,
  etaBaseline,
  reduceMotion = false,
  compact = false,
}: AodCardProps) {
  const { t, i18n } = useTranslation();
  const accent = aodAccent(view.accent);
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const finalMinute = displayEta <= 60 && trip.state !== 'arrived';
  const fraction = etaBaseline > 0 ? 1 - Math.min(1, displayEta / etaBaseline) : 1;

  return (
    <motion.div
      className={`w-full rounded-3xl border ${compact ? 'p-3' : 'p-4'}`}
      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Row 1 — identity + state */}
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.08)', width: compact ? 24 : 30, height: compact ? 24 : 30 }}
        >
          <Bus size={compact ? 13 : 16} strokeWidth={1.75} color={accent} aria-hidden />
        </span>
        <p className={`min-w-0 flex-1 truncate ${compact ? 'text-[10px]' : 'text-xs'} font-medium`} style={{ color: AOD_WHITE }}>
          {view.headline}
        </p>
        <span
          className={`darbi-chip ${compact ? 'text-[8px]' : 'text-[10px]'}`}
          style={{ background: 'rgba(255,255,255,0.08)', color: accent }}
        >
          {view.stateLabel}
        </span>
      </div>

      {/* Row 2 — the ring */}
      <div className={`flex items-center gap-3 ${compact ? 'mt-2' : 'mt-3'}`}>
        <CountdownRing
          fraction={fraction}
          accent={accent}
          label={trip.state === 'arrived' ? '0' : String(finalMinute ? displayEta : etaMinutes(displayEta))}
          unit={finalMinute ? t('common.sec') : t('aod.minutesShort')}
          size={compact ? 62 : 96}
          pulse={finalMinute}
          reduceMotion={reduceMotion}
        />
        <div className="min-w-0 flex-1">
          <p className={`tabnum ${compact ? 'text-xl' : 'text-3xl'} font-light`} style={{ color: AOD_WHITE }}>
            {trip.state === 'arrived' ? t('aod.arrivedNow') : formatMmSs(displayEta)}
          </p>
          <p className={`mt-0.5 ${compact ? 'text-[9px]' : 'text-[11px]'}`} style={{ color: AOD_DIM }}>
            {t('island.arrivingIn')}
          </p>
          {view.delayMinutes > 0 ? (
            <p className={`mt-1 ${compact ? 'text-[9px]' : 'text-[11px]'}`} style={{ color: accent }}>
              {t('track.delayedBy', { minutes: view.delayMinutes })}
            </p>
          ) : null}
        </div>
      </div>

      {/* Row 3 — the same rail the island uses */}
      <div className={compact ? 'mt-2' : 'mt-3'}>
        <StopRail
          stops={stops}
          fractions={view.fractions}
          progress={view.progress}
          currentSeq={trip.current_stop_seq}
          accent={accent}
          dark
          showLabels={!compact}
          animate={!reduceMotion}
          nowLabel={t('island.now')}
        />
      </div>

      {/* Row 4 — the facts */}
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? 'mt-1 text-[9px]' : 'mt-2 text-[11px]'}`}
        style={{ color: AOD_DIM }}
      >
        <span className="tabnum">{t('aod.away', { distance: view.distance })}</span>
        <span aria-hidden>·</span>
        <span className="tabnum">{t('aod.arrives', { time: arrivalClock(displayEta, lang) })}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{studentName}</span>
      </div>
    </motion.div>
  );
}
