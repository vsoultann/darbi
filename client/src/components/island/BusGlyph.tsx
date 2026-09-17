/**
 * The bus icon inside the island (§6.3.2, §6.4).
 *
 * It bobs ±1.5px and rotates ±2° on a 1.2s loop whose speed scales with `speed_kmh`,
 * and trails two exhaust dots while the trip is `en_route`.
 */
import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';

export interface BusGlyphProps {
  size?: number;
  color: string;
  speedKmh: number;
  moving: boolean;
  reduceMotion?: boolean;
  layoutId?: string;
  showExhaust?: boolean;
}

export function BusGlyph({
  size = 18,
  color,
  speedKmh,
  moving,
  reduceMotion = false,
  layoutId,
  showExhaust = true,
}: BusGlyphProps) {
  // 34 km/h is nominal; faster buses bob faster, clamped so it never looks frantic.
  const duration = Math.min(2.2, Math.max(0.55, 1.2 * (34 / Math.max(8, speedKmh))));
  const animate = moving && !reduceMotion ? { y: [0, -1.5, 0, 1.5, 0], rotate: [0, 2, 0, -2, 0] } : { y: 0, rotate: 0 };

  return (
    <motion.span
      layoutId={layoutId}
      className="relative inline-flex items-center justify-center"
      animate={{ color }}
      transition={{ color: { duration: 0.4, ease: 'easeInOut' } }}
    >
      {showExhaust && moving && !reduceMotion ? (
        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ insetInlineEnd: '100%' }}>
          {[0, 1].map((index) => (
            <motion.span
              key={index}
              className="absolute block rounded-full"
              style={{ width: 3, height: 3, background: 'currentColor', insetInlineEnd: index * 5 }}
              animate={{ opacity: [0.55, 0], scale: [1, 0.4], x: [0, -6] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.45, ease: 'easeOut' }}
            />
          ))}
        </span>
      ) : null}
      <motion.span
        className="inline-flex"
        animate={animate}
        transition={moving && !reduceMotion ? { duration, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      >
        <Bus size={size} strokeWidth={1.75} color="currentColor" aria-hidden />
      </motion.span>
    </motion.span>
  );
}
