/**
 * Arrival burst (§6.3.7): a green flash, a checkmark that draws itself via `pathLength`,
 * and eight particles radiating outward. Haptics are fired by the island controller.
 */
import { motion } from 'framer-motion';

const PARTICLES = Array.from({ length: 8 }, (_, index) => (index / 8) * Math.PI * 2);

export function ArrivalBurst({ reduceMotion = false, radius = 46 }: { reduceMotion?: boolean; radius?: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
      style={{ borderRadius: 'inherit' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: '#2E7D5B' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: reduceMotion ? 0.28 : [0, 0.92, 0.3] }}
        transition={{ duration: reduceMotion ? 0.15 : 0.9, times: [0, 0.25, 1] }}
      />

      {!reduceMotion
        ? PARTICLES.map((angle, index) => (
            <motion.span
              key={index}
              className="absolute block h-1.5 w-1.5 rounded-full bg-white"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                scale: [0.4, 1, 0.3],
              }}
              transition={{ duration: 0.85, delay: 0.08 + index * 0.012, ease: 'easeOut' }}
            />
          ))
        : null}

      <svg width="40" height="40" viewBox="0 0 24 24" className="relative z-10" aria-hidden>
        <motion.path
          d="M4.5 12.6 L9.6 17.8 L19.6 6.6"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.001 : 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        />
      </svg>
    </motion.div>
  );
}
