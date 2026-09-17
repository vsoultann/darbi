/** Circular countdown (§7.1 row 2): an SVG ring animated through `strokeDashoffset`. */
import { motion } from 'framer-motion';
import { AOD_DIM } from '@/lib/color';

export interface CountdownRingProps {
  /** 0..1 of the ring that should be filled. */
  fraction: number;
  accent: string;
  label: string;
  unit: string;
  size?: number;
  pulse?: boolean;
  reduceMotion?: boolean;
}

export function CountdownRing({
  fraction,
  accent,
  label,
  unit,
  size = 96,
  pulse = false,
  reduceMotion = false,
}: CountdownRingProps) {
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <motion.div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      animate={pulse && !reduceMotion ? { scale: [1, 1.035, 1] } : { scale: 1 }}
      transition={{ duration: 1.6, repeat: pulse && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
        <motion.circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke={accent}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          initial={false}
          animate={{ strokeDashoffset: 1 - clamped }}
          transition={reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 60, damping: 20 }}
        />
      </svg>
      <span className="absolute flex flex-col items-center leading-none">
        <span className="tabnum text-[26px] font-light" style={{ color: 'rgba(255,255,255,0.86)' }}>
          {label}
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wider" style={{ color: AOD_DIM }}>
          {unit}
        </span>
      </span>
    </motion.div>
  );
}
