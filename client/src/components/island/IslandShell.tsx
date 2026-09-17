/**
 * The Dynamic Island pill (§6.1).
 *
 * One element morphs between the three sizes with a single spring — the black body is a
 * blob inside the gooey filter layer, the content rides on top unfiltered so text stays
 * crisp. A droplet blob is released on every morph so MINIMAL → COMPACT reads as liquid.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { IslandMode } from '@shared/types';

export const ISLAND_SIZES: Record<IslandMode, { width: number; height: number; radius: number }> = {
  minimal: { width: 56, height: 34, radius: 17 },
  compact: { width: 220, height: 38, radius: 19 },
  expanded: { width: 360, height: 190, radius: 34 },
};

export const ISLAND_SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 } as const;
/** Accent colours cross-fade rather than snap (§6.3.5). */
export const ACCENT_TRANSITION = { duration: 0.4, ease: 'easeInOut' } as const;
/** MINIMAL breathes 1.0 ↔ 1.04 on a 2.4s loop (§6.3.1). */
const BREATHE_TRANSITION = { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } as const;

export interface IslandShellProps {
  mode: IslandMode;
  reduceMotion: boolean;
  accent: string;
  pulse: boolean;
  children: React.ReactNode;
  interactive?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
  onDismiss?: () => void;
  maxWidth?: number;
}

export function IslandShell({
  mode,
  reduceMotion,
  accent,
  pulse,
  children,
  interactive = true,
  onTap,
  onLongPress,
  onDismiss,
  maxWidth,
}: IslandShellProps) {
  const base = ISLAND_SIZES[mode];
  const width = maxWidth ? Math.min(base.width, maxWidth) : base.width;
  const size = { ...base, width };
  const [droplet, setDroplet] = useState(0);
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  // Every morph releases one droplet, which the gooey filter melts back into the pill.
  useEffect(() => {
    if (reduceMotion) return;
    setDroplet((value) => value + 1);
  }, [mode, reduceMotion]);

  const startPress = (): void => {
    if (!interactive || !onLongPress) return;
    const timer = window.setTimeout(() => onLongPress(), 500);
    setPressTimer(timer);
  };
  const endPress = (): void => {
    if (pressTimer !== null) window.clearTimeout(pressTimer);
    setPressTimer(null);
  };

  // Breathing lives on the outer element so the gooey body and the content scale as one.
  const breathing = mode === 'minimal' && !reduceMotion;

  return (
    <motion.div
      className="relative"
      style={{ width: size.width, height: size.height }}
      animate={{ width: size.width, height: size.height, scale: breathing ? [1, 1.04, 1] : 1 }}
      transition={{
        ...(reduceMotion ? { duration: 0.15 } : ISLAND_SPRING),
        scale: breathing ? BREATHE_TRANSITION : { duration: 0.3 },
      }}
    >
      {/* Approaching pulse (§6.3.6) */}
      <AnimatePresence>
        {pulse && !reduceMotion ? (
          <motion.span
            key="pulse"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ border: `2px solid ${accent}`, borderRadius: size.radius }}
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: [0.5, 0], scale: [1, 1.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        ) : null}
      </AnimatePresence>

      {/* Gooey black body */}
      <div className="darbi-goo pointer-events-none absolute -inset-8 flex items-center justify-center">
        <motion.div
          className="bg-black"
          style={{ width: size.width, height: size.height, borderRadius: size.radius }}
          animate={{ width: size.width, height: size.height, borderRadius: size.radius }}
          transition={reduceMotion ? { duration: 0.15 } : ISLAND_SPRING}
        />
        {!reduceMotion ? (
          <AnimatePresence>
            <motion.span
              key={droplet}
              className="absolute block rounded-full bg-black"
              style={{ width: 16, height: 16 }}
              initial={{ opacity: 1, scale: 0.2, y: 0 }}
              animate={{ opacity: [1, 1, 0], scale: [0.2, 1, 0.1], y: [0, 14, 20] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.52, ease: 'easeOut' }}
            />
          </AnimatePresence>
        ) : null}
      </div>

      {/* Interaction + content layer */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: size.radius, touchAction: interactive ? 'none' : 'auto' }}
        animate={{ borderRadius: size.radius }}
        transition={reduceMotion ? { duration: 0.15 } : ISLAND_SPRING}
        drag={interactive && onDismiss ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 80 }}
        dragElastic={0.22}
        dragSnapToOrigin
        onDragEnd={(_event, info) => {
          if (info.offset.y > 60) onDismiss?.();
        }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onClick={interactive ? onTap : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={(event) => {
          if (!interactive) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onTap?.();
          }
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]"
          style={{ borderRadius: size.radius }}
        />
        {children}
      </motion.div>
    </motion.div>
  );
}
