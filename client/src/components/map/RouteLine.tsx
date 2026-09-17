/** The bronze route line, with a parchment casing so it reads over any tile. */
import { useEffect } from 'react';
import type { GeoJSONSource } from 'maplibre-gl';
import type { BusRoute } from '@shared/types';
import { toFeature } from '@/lib/geo';
import { useMapInstance } from './TrackMap';

const SOURCE = 'darbi-route';

export function RouteLine({ route, dark }: { route: BusRoute; dark: boolean }) {
  const map = useMapInstance();

  useEffect(() => {
    if (!map) return;
    const data = toFeature(route.polyline);

    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: 'darbi-route-casing',
        type: 'line',
        source: SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': dark ? '#0F0B07' : '#FFFDF8',
          'line-width': 9,
          'line-opacity': 0.9,
        },
      });
      map.addLayer({
        id: 'darbi-route-line',
        type: 'line',
        source: SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#A67C3D',
          'line-width': 4.5,
          'line-opacity': 0.95,
        },
      });
    } else {
      const source = map.getSource(SOURCE) as GeoJSONSource | undefined;
      source?.setData(data);
    }

    return () => {
      if (!map.getStyle()) return;
      for (const id of ['darbi-route-line', 'darbi-route-casing']) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
  }, [map, route, dark]);

  return null;
}
