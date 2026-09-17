/**
 * The notch live activity — iPhone X … 14 (and any iPhone whose safe-area inset says
 * "notch"). Those phones have no Dynamic Island, so the activity grows out of the notch
 * itself instead: a black status strip that merges with the hardware cutout, content in
 * the two "ears" beside it, and a panel that unfolds downward when expanded.
 *
 * Non-iPhone devices never get this shell (see lib/device.ts) — they get the pill.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { IslandMode } from '@shared/types';
import type { ChromeMetrics } from '@/lib/device';
import { BusGlyph } from './BusGlyph';
import { CountdownDigits } from './CountdownDigits';
import type { IslandView } from './useIslandView';

export const NOTCH_PANEL_HEIGHT = 190;
export const NOTCH_SPRING = { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 } as const;

export interface NotchShellProps {
  mode: IslandMode;
  metrics: ChromeMetrics;
  view: IslandView;
  reduceMotion: boolean;
  speedKmh: number;
  /** Draw the cutout ourselves — true on anything that is not a real notched iPhone. */
  drawCutout: boolean;
  interactive?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export function NotchShell({
  mode,
  metrics,
  view,
  reduceMotion,
  speedKmh,
  drawCutout,
  interactive = true,
  onTap,
  onLongPress,
  onDismiss,
  children,
}: NotchShellProps) {
  const expanded = mode === 'expanded';
  const barHeight = Math.max(38, metrics.barHeight);
  const height = barHeight + (expanded ? NOTCH_PANEL_HEIGHT : 0);
  const radius = expanded ? 32 : 0;
  const [pressTimer, setPressTimer] = useState<number | null>(null);
  const [droplet, setDroplet] = useState(0);

  useEffect(() => {
    if (!reduceMotion) setDroplet((value) => value + 1);
  }, [mode, reduceMotion]);

  const startPress = (): void => {
    if (!interactive || !onLongPress) return;
    setPressTimer(window.setTimeout(() => onLongPress(), 500));
  };
  const endPress = (): void => {
    if (pressTimer !== null) window.clearTimeout(pressTimer);
    setPressTimer(null);
  };

  return (
    <motion.div
      className="relative w-full"
      animate={{ height }}
      initial={false}
      style={{ height }}
      transition={reduceMotion ? { duration: 0.15 } : NOTCH_SPRING}
    >
      {/* Black chrome: the bar, the cutout and the unfolding panel are one gooey shape. */}
      <div className="darbi-goo pointer-events-none absolute inset-x-0 -bottom-8 top-0">
        <motion.div
          className="absolute inset-x-0 top-0 bg-black"
          animate={{ height, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }}
          initial={false}
          transition={reduceMotion ? { duration: 0.15 } : NOTCH_SPRING}
        />
        <div
          className="absolute top-0 bg-black"
          style={{
            insetInlineStart: '50%',
            transform: 'translateX(-50%)',
            width: metrics.cutoutWidth,
            height: metrics.cutoutHeight + 2,
            borderBottomLeftRadius: metrics.cutoutRadius,
            borderBottomRightRadius: metrics.cutoutRadius,
          }}
        />
        {!reduceMotion ? (
          <AnimatePresence>
            <motion.span
              key={droplet}
              className="absolute block rounded-full bg-black"
              style={{ insetInlineStart: '50%', width: 18, height: 18, marginInlineStart: -9 }}
              initial={{ opacity: 1, scale: 0.2, top: barHeight - 10 }}
              animate={{ opacity: [1, 1, 0], scale: [0.2, 1, 0.1], top: barHeight + (expanded ? 18 : 6) }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </AnimatePresence>
        ) : null}
      </div>

      {/* A faint cutout outline, so the shape still reads on a device without a notch. */}
      {drawCutout ? (
        <span
          className="pointer-events-none absolute top-0 ring-1 ring-inset ring-white/20"
          style={{
            insetInlineStart: '50%',
            transform: 'translateX(-50%)',
            width: metrics.cutoutWidth,
            height: metrics.cutoutHeight,
            borderBottomLeftRadius: metrics.cutoutRadius,
            borderBottomRightRadius: metrics.cutoutRadius,
          }}
        />
      ) : null}

      {/* Approaching pulse: a glow that sweeps out of the bottom edge of the bar. */}
      <AnimatePresence>
        {view.approaching && !reduceMotion ? (
          <motion.span
            key="notch-pulse"
            className="pointer-events-none absolute inset-x-0"
            style={{ top: barHeight - 2, height: 3, background: view.accent, filter: 'blur(3px)' }}
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={{ opacity: [0.65, 0], scaleX: [0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        ) : null}
      </AnimatePresence>

      {/* Interaction layer: ears + panel */}
      <motion.div
        className="absolute inset-0"
        style={{ touchAction: interactive ? 'none' : 'auto' }}
        drag={interactive && onDismiss ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 80 }}
        dragElastic={0.2}
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
        <div className="absolute inset-x-0 top-0 flex items-center" style={{ height: barHeight }}>
          {/* left ear */}
          <div className="flex flex-1 items-center justify-center gap-1.5 px-2">
            <BusGlyph
              layoutId="darbi-island-bus"
              size={15}
              color={view.accent}
              speedKmh={speedKmh}
              moving={view.moving}
              reduceMotion={reduceMotion}
              showExhaust={mode !== 'minimal'}
            />
            {mode !== 'minimal' ? (
              <span className="truncate text-[10.5px] font-medium text-white/60">{view.stateLabel}</span>
            ) : null}
          </div>

          {/* the cutout itself — nothing may be drawn here */}
          <div style={{ width: metrics.cutoutWidth }} aria-hidden />

          {/* right ear */}
          <div className="flex flex-1 items-center justify-center gap-1 px-2">
            {mode === 'minimal' ? (
              <motion.span
                className="block rounded-full"
                style={{ width: 7, height: 7, background: view.accent }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <>
                <CountdownDigits
                  value={view.etaShort.split(' ')[0]}
                  reduceMotion={reduceMotion}
                  className="text-[12.5px] font-semibold text-white/92"
                  ariaLabel={view.etaShort}
                />
                <span className="text-[10.5px] font-medium text-white/55">{view.etaShort.split(' ')[1]}</span>
              </>
            )}
          </div>
        </div>

        {/* progress hairline along the bottom edge of the bar */}
        {mode !== 'minimal' ? (
          <div
            className="absolute inset-x-8 h-[2px] overflow-hidden rounded-full bg-white/10"
            style={{ top: barHeight - 5 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: view.accent }}
              animate={{ width: `${Math.round(view.progress * 100)}%` }}
              transition={reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 110, damping: 22 }}
            />
          </div>
        ) : null}

        <AnimatePresence>
          {expanded ? (
            <motion.div
              key="notch-panel"
              className="absolute inset-x-0 overflow-hidden"
              style={{ top: barHeight, height: NOTCH_PANEL_HEIGHT }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
