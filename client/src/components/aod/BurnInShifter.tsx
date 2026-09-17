/**
 * Burn-in protection (§7.2): every 60 s the whole content block drifts to a new random
 * offset within ±5 px, animated over 2 s. Silent by design — no logging, no flicker.
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function BurnInShifter({
  children,
  enabled = true,
  intervalMs = 60000,
  amplitude = 5,
  className = '',
}: {
  children: React.ReactNode;
  enabled?: boolean;
  intervalMs?: number;
  amplitude?: number;
  className?: string;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const shift = (): void => {
      setOffset({
        x: Math.round((Math.random() * 2 - 1) * amplitude),
        y: Math.round((Math.random() * 2 - 1) * amplitude),
      });
    };
    const timer = window.setInterval(shift, intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, amplitude]);

  return (
    <motion.div className={className} animate={{ x: offset.x, y: offset.y }} transition={{ duration: 2, ease: 'easeInOut' }}>
      {children}
    </motion.div>
  );
}
