/** The bus itself: a React element portalled into a MapLibre marker so it can animate. */
import { motion } from 'framer-motion';
import { Marker } from 'maplibre-gl';
import { Bus } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TripUpdate } from '@shared/types';
import { stateAccent } from '@shared/types';
import { useMapInstance } from './TrackMap';

export function BusMarker({ trip, reduceMotion = false }: { trip: TripUpdate; reduceMotion?: boolean }) {
  const map = useMapInstance();
  const element = useMemo(() => document.createElement('div'), []);
  const marker = useRef<Marker | null>(null);
  const accent = stateAccent(trip.state);

  useEffect(() => {
    if (!map) return;
    element.style.willChange = 'transform';
    marker.current = new Marker({ element, anchor: 'center' })
      .setLngLat([trip.lng, trip.lat])
      .addTo(map);
    return () => {
      marker.current?.remove();
      marker.current = null;
    };
  }, [map, element, trip.lat, trip.lng]);

  useEffect(() => {
    marker.current?.setLngLat([trip.lng, trip.lat]);
  }, [trip.lng, trip.lat]);

  const moving = trip.state === 'en_route' || trip.state === 'approaching' || trip.state === 'delayed';

  return createPortal(
    <div className="relative flex h-10 w-10 items-center justify-center">
      {moving && !reduceMotion ? (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${accent}` }}
          animate={{ opacity: [0.45, 0], scale: [0.7, 1.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : null}
      {/* Heading is shown by the nose, not by spinning the bus: a rotated side-view bus
          reads as a mistake, a rotating pointer reads as direction. */}
      <motion.span
        className="absolute inset-0"
        animate={{ rotate: trip.heading }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      >
        <span
          className="absolute left-1/2 top-0 block h-0 w-0 -translate-x-1/2"
          style={{
            borderInlineStart: '5px solid transparent',
            borderInlineEnd: '5px solid transparent',
            borderBottom: `8px solid ${accent}`,
          }}
        />
      </motion.span>
      <motion.span
        className="relative flex h-8 w-8 items-center justify-center rounded-full shadow-warmlg"
        style={{ background: '#F5B500', border: `2px solid ${accent}` }}
        animate={reduceMotion ? {} : { y: moving ? [0, -1.5, 0, 1.5, 0] : 0 }}
        transition={{ duration: 1.2, repeat: moving && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
      >
        <Bus size={16} strokeWidth={2} color="#3B2A1A" aria-hidden />
      </motion.span>
    </div>,
    element,
  );
}
