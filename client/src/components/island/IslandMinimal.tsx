/** MINIMAL — 56 × 34: an animated bus glyph and a state-coloured dot (§6.1). */
import { motion } from 'framer-motion';
import { BusGlyph } from './BusGlyph';
import type { IslandView } from './useIslandView';

export function IslandMinimal({ view, reduceMotion }: { view: IslandView; reduceMotion: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-1.5 px-2">
      <BusGlyph
        layoutId="darbi-island-bus"
        size={15}
        color={view.accent}
        speedKmh={34}
        moving={view.moving}
        reduceMotion={reduceMotion}
        showExhaust={false}
      />
      <motion.span
        className="block rounded-full"
        style={{ width: 7, height: 7, background: view.accent }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
