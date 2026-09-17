/** Stop circles (passed vs upcoming) plus labelled pins for the child's stop and school. */
import { Marker, type GeoJSONSource } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Stop } from '@shared/types';
import { stopsToFeatureCollection } from '@/lib/geo';
import { useMapInstance } from './TrackMap';

const SOURCE = 'darbi-stops';

export function StopPins({
  stops,
  currentSeq,
  dark,
  highlightStopId,
}: {
  stops: Stop[];
  currentSeq: number;
  dark: boolean;
  highlightStopId?: string;
}) {
  const map = useMapInstance();
  const { i18n, t } = useTranslation();
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!map) return;
    const data = stopsToFeatureCollection(stops, currentSeq);

    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: 'darbi-stops-halo',
        type: 'circle',
        source: SOURCE,
        paint: {
          'circle-radius': 8,
          'circle-color': dark ? '#0F0B07' : '#FFFDF8',
          'circle-opacity': 0.9,
        },
      });
      map.addLayer({
        id: 'darbi-stops-dot',
        type: 'circle',
        source: SOURCE,
        paint: {
          'circle-radius': 4.5,
          'circle-color': ['case', ['==', ['get', 'passed'], 1], '#C9A227', dark ? '#5C4A36' : '#E0D2BC'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#A67C3D',
        },
      });
    } else {
      const source = map.getSource(SOURCE) as GeoJSONSource | undefined;
      source?.setData(data);
    }

    return () => {
      if (!map.getStyle()) return;
      for (const id of ['darbi-stops-dot', 'darbi-stops-halo']) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
  }, [map, stops, currentSeq, dark]);

  // Labels for the two stops a parent actually looks for.
  useEffect(() => {
    if (!map) return;
    const isArabic = i18n.language === 'ar';
    const labelled = stops.filter(
      (stop) => stop.id === highlightStopId || stop.seq === stops[stops.length - 1]?.seq,
    );

    markers.current = labelled.map((stop) => {
      const element = document.createElement('div');
      element.className =
        'rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-warm whitespace-nowrap';
      element.style.background = dark ? 'rgba(36,26,17,0.92)' : 'rgba(255,253,248,0.94)';
      element.style.borderColor = stop.id === highlightStopId ? '#A67C3D' : '#E0D2BC';
      element.style.color = dark ? '#F3E8D6' : '#3B2A1A';
      element.textContent =
        (stop.id === highlightStopId ? `${t('track.yourStop')} · ` : '') +
        (isArabic ? stop.name_ar : stop.name_en);
      return new Marker({ element, anchor: 'bottom', offset: [0, -10] })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);
    });

    return () => {
      for (const marker of markers.current) marker.remove();
      markers.current = [];
    };
  }, [map, stops, highlightStopId, dark, i18n.language, t]);

  return null;
}
