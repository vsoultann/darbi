/**
 * The stop rail (§6.2, reused by the AOD card §7.1 row 3).
 *
 * Dots sit at each stop's true fraction along the route polyline, so the rail and the
 * map never disagree about where the bus is. Passed stops fill bronze→gold; upcoming
 * stops stay outlined (§6.3.3).
 */
import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Stop } from '@shared/types';

export interface StopRailProps {
  stops: Stop[];
  fractions: Record<number, number>;
  progress: number;
  currentSeq: number;
  accent: string;
  /** Dark rail for the island and the AOD; light rail for cards. */
  dark?: boolean;
  showLabels?: boolean;
  animate?: boolean;
  className?: string;
  nowLabel?: string;
}

export function StopRail({
  stops,
  fractions,
  progress,
  currentSeq,
  accent,
  dark = false,
  showLabels = true,
  animate = true,
  className = '',
  nowLabel,
}: StopRailProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const pct = Math.min(100, Math.max(0, progress * 100));
  const trackColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(224,210,188,0.9)';

  return (
    <div className={`relative ${showLabels ? 'pb-5' : ''} ${className}`} aria-hidden>
      <div className="relative h-4">
        {/* base line */}
        <div
          className="absolute top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full"
          style={{ background: trackColor }}
        />
        {/* travelled line */}
        <motion.div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #A67C3D 0%, #C9A227 100%)',
            [isRtl ? 'right' : 'left']: 0,
          }}
          animate={{ width: `${pct}%` }}
          transition={animate ? { type: 'spring', stiffness: 120, damping: 24 } : { duration: 0 }}
        />

        {stops.map((stop) => {
          const fraction = (fractions[stop.seq] ?? 0) * 100;
          const passed = stop.seq <= currentSeq;
          return (
            <span
              key={stop.id}
              className="absolute top-1/2 -translate-y-1/2 rounded-full border transition-colors"
              style={{
                insetInlineStart: `${fraction}%`,
                transform: `translate(${isRtl ? '50%' : '-50%'}, -50%)`,
                width: passed ? 9 : 8,
                height: passed ? 9 : 8,
                background: passed ? '#C9A227' : dark ? '#000' : '#FFFDF8',
                borderColor: passed ? '#C9A227' : dark ? 'rgba(255,255,255,0.35)' : '#E0D2BC',
              }}
            />
          );
        })}

        {/* the bus itself */}
        <motion.span
          key={isRtl ? 'rtl' : 'ltr'}
          className="absolute top-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full"
          style={{
            background: accent,
            boxShadow: `0 0 0 3px ${dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,253,248,0.9)'}`,
            transform: `translate(${isRtl ? '50%' : '-50%'}, -50%)`,
          }}
          animate={{ [isRtl ? 'right' : 'left']: `${pct}%` }}
          transition={animate ? { type: 'spring', stiffness: 90, damping: 20, mass: 0.8 } : { duration: 0 }}
        >
          <Bus size={11} strokeWidth={2} color={dark ? '#0B0B0B' : '#2B1E12'} aria-hidden />
        </motion.span>
      </div>

      {showLabels ? (
        <div className="relative mt-1 h-4">
          {stops.map((stop) => {
            const fraction = (fractions[stop.seq] ?? 0) * 100;
            const isCurrent = stop.seq === currentSeq;
            const name = i18n.language === 'ar' ? stop.name_ar : stop.name_en;
            return (
              <span
                key={stop.id}
                className={`absolute whitespace-nowrap text-[9px] leading-none ${
                  isCurrent ? 'font-semibold' : ''
                }`}
                style={{
                  insetInlineStart: `${fraction}%`,
                  transform: `translateX(${isRtl ? '50%' : '-50%'})`,
                  color: isCurrent ? accent : dark ? 'rgba(255,255,255,0.5)' : '#8A7357',
                }}
              >
                {isCurrent && nowLabel ? nowLabel : name.split(' ').slice(0, 2).join(' ')}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
