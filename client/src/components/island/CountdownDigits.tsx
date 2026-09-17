/**
 * Per-digit countdown (§6.3.4).
 *
 * Only the digits that actually changed re-render: each character is its own
 * AnimatePresence slot keyed by its value, so a new digit slides in from below while
 * the old one leaves upward. Slots have a fixed em width and tabular figures, so the
 * number can never change width mid-countdown.
 */
import { AnimatePresence, motion } from 'framer-motion';

export interface CountdownDigitsProps {
  value: string;
  className?: string;
  reduceMotion?: boolean;
  ariaLabel?: string;
}

const DIGIT_SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 } as const;

export function CountdownDigits({ value, className = '', reduceMotion = false, ariaLabel }: CountdownDigitsProps) {
  const characters = value.split('');

  return (
    <span
      className={`tabnum inline-flex items-center leading-none ${className}`}
      role="timer"
      aria-label={ariaLabel ?? value}
    >
      {characters.map((character, index) => {
        const isSeparator = character === ':' || character === '.';
        return (
          <span
            key={`slot-${index}`}
            className="relative inline-block h-[1em] overflow-hidden text-center"
            style={{ width: isSeparator ? '0.34em' : '0.58em' }}
            aria-hidden
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={`${index}-${character}`}
                className="absolute inset-0 flex items-center justify-center"
                initial={reduceMotion ? { opacity: 0 } : { y: '105%', opacity: 0 }}
                animate={reduceMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { y: '-105%', opacity: 0 }}
                transition={reduceMotion ? { duration: 0.12 } : DIGIT_SPRING}
              >
                {character}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
