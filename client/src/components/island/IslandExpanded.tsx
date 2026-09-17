/** EXPANDED — the full live activity card (§6.2). */
import { motion } from 'framer-motion';
import { Clock, MapPin, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Stop } from '@shared/types';
import { StopRail } from '@/components/shared/StopRail';
import { CountdownDigits } from './CountdownDigits';
import { BusGlyph } from './BusGlyph';
import type { IslandView } from './useIslandView';

export interface IslandExpandedProps {
  view: IslandView;
  stops: Stop[];
  currentSeq: number;
  reduceMotion: boolean;
  speedKmh: number;
}

export function IslandExpanded({ view, stops, currentSeq, reduceMotion, speedKmh }: IslandExpandedProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="flex h-full w-full flex-col justify-between p-3.5"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, delay: 0.04 }}
    >
      <header className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
          <BusGlyph
            layoutId="darbi-island-bus"
            size={17}
            color={view.accent}
            speedKmh={speedKmh}
            moving={view.moving}
            reduceMotion={reduceMotion}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-white/90">{view.headline}</p>
          <p className="text-[11px] font-medium" style={{ color: view.accent }}>
            {view.stateLabel}
            {view.delayMinutes > 0 ? ` · ${t('track.delayedBy', { minutes: view.delayMinutes })}` : ''}
          </p>
        </div>
        <motion.span
          className="mt-1 block h-2 w-2 shrink-0 rounded-full"
          style={{ background: view.accent }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </header>

      <StopRail
        stops={stops}
        fractions={view.fractions}
        progress={view.progress}
        currentSeq={currentSeq}
        accent={view.accent}
        animate={!reduceMotion}
        dark
        nowLabel={t('island.now')}
        className="px-1"
      />

      <footer className="grid grid-cols-3 gap-2">
        <Metric
          icon={<Clock size={13} strokeWidth={1.75} style={{ color: view.accent }} />}
          value={
            <CountdownDigits
              value={view.mmss}
              reduceMotion={reduceMotion}
              className="text-[15px] font-semibold text-white"
              ariaLabel={`${t('island.arrivingIn')} ${view.mmss}`}
            />
          }
          label={t('island.arrivingIn')}
        />
        <Metric
          icon={<MapPin size={13} strokeWidth={1.75} style={{ color: view.accent }} />}
          value={<span className="tabnum text-[15px] font-semibold text-white">{view.distance}</span>}
          label={t('island.distance')}
        />
        <Metric
          icon={<User size={13} strokeWidth={1.75} style={{ color: view.accent }} />}
          value={<span className="truncate text-[15px] font-semibold text-white">{view.studentName}</span>}
          label={`${t('track.id')} ${view.studentNo}`}
        />
      </footer>
    </motion.div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        {value}
      </div>
      <p className="mt-0.5 truncate text-[9.5px] uppercase tracking-wide text-white/45">{label}</p>
    </div>
  );
}
