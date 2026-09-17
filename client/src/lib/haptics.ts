/** Vibration wrapper. Always safe to call: unsupported browsers just no-op. */
let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function vibrate(pattern: number | readonly number[]): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    /* Safari throws on some gestures — a missing buzz is never worth an error */
  }
}

export const HAPTIC = {
  tap: [12],
  expand: [18, 30, 18],
  arrive: [40, 60, 40],
  alert: [80, 40, 80, 40, 160],
} as const;
