/** COMPACT — 220 × 38: bus glyph, ETA, and a progress hairline underneath (§6.1). */
import { motion } from 'framer-motion';
import { BusGlyph } from './BusGlyph';
import { CountdownDigits } from './CountdownDigits';
import type { IslandView } from './useIslandView';

export function IslandCompact({
  view,
  reduceMotion,
  speedKmh,
}: {
  view: IslandView;
  reduceMotion: boolean;
  speedKmh: number;
}) {
  const [amount, unit] = view.etaShort.split(' ');

  return (
    <div className="relative flex h-full w-full items-center justify-between gap-2 px-3.5">
      <BusGlyph
        layoutId="darbi-island-bus"
        size={16}
        color={view.accent}
        speedKmh={speedKmh}
        moving={view.moving}
        reduceMotion={reduceMotion}
      />

      <span className="flex items-baseline gap-1 text-white/92">
        <CountdownDigits
          value={amount}
          reduceMotion={reduceMotion}
          className="text-[13px] font-semibold"
          ariaLabel={view.etaShort}
        />
        <span className="text-[11px] font-medium text-white/60">{unit}</span>
      </span>

      <div className="absolute inset-x-3.5 bottom-[5px] h-[2px] overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${Math.round(view.progress * 100)}%`, backgroundColor: view.accent }}
          transition={{
            width: reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 110, damping: 22 },
            backgroundColor: { duration: 0.4, ease: 'easeInOut' },
          }}
        />
      </div>
    </div>
  );
}
