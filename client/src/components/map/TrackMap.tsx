/**
 * MapLibre canvas with a warm, key-free basemap (§3).
 *
 * Tiles come from CARTO's free raster endpoints; if the network is down the background
 * layer still paints sand and the route line still draws, so the demo never shows a
 * grey void. The warm tint is a CSS filter on the canvas (see globals.css).
 */
import { Map as MapLibreMap, NavigationControl, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { BusRoute } from '@shared/types';
import { boundsOf } from '@/lib/geo';

const MapContext = createContext<MapLibreMap | null>(null);
export function useMapInstance(): MapLibreMap | null {
  return useContext(MapContext);
}

/**
 * Primary basemap: OpenFreeMap's public vector tiles — genuinely key-free and
 * unmetered. Positron and Dark are near-greyscale, which is what makes the warm sepia
 * tint in globals.css read as sand and parchment rather than as a filter.
 */
function vectorStyleUrl(dark: boolean): string {
  return `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`;
}

/** Fallback if that host is blocked: plain OSM raster, and failing that, bare sand. */
function rasterStyle(dark: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'canvas', type: 'background', paint: { 'background-color': dark ? '#14100B' : '#F7F2E9' } },
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
        paint: {
          'raster-opacity': dark ? 0.55 : 0.85,
          'raster-saturation': -0.45,
          'raster-contrast': dark ? -0.1 : 0.05,
        },
      },
    ],
  };
}

export interface TrackMapProps {
  route: BusRoute;
  dark: boolean;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
  onReady?: (map: MapLibreMap) => void;
}

export function TrackMap({ route, dark, interactive = true, className = '', children, onReady }: TrackMapProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fellBack = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const bounds = boundsOf(route.polyline.coordinates);

    const map = new MapLibreMap({
      container: container.current,
      style: vectorStyleUrl(dark),
      bounds: [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true },
      interactive,
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 17,
      minZoom: 9,
    });

    map.touchZoomRotate.disableRotation();
    if (interactive) {
      // Top-right: bottom-right belongs to the page's own map buttons.
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    }

    map.on('load', () => {
      mapRef.current = map;
      setReady(true);
      onReady?.(map);
    });
    mapRef.current = map;

    // If the tile host is unreachable the style never loads and the map would stay
    // blank; swap to raster once, quietly, so the demo always has a map under the bus.
    const fallbackTimer = window.setTimeout(() => {
      if (map.isStyleLoaded() || fellBack.current) return;
      fellBack.current = true;
      map.setStyle(rasterStyle(dark), { diff: false });
      map.once('styledata', () => {
        setReady(true);
        onReady?.(map);
      });
    }, 4000);

    return () => {
      window.clearTimeout(fallbackTimer);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The map is created once; theme changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Theme swap. `setStyle` wipes every source the children added, so they are unmounted
   * (ready = false) and remounted once the new style is in — and this must never run on
   * the first render, or it would tear down the layers the map just gained.
   */
  const appliedDark = useRef(dark);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedDark.current === dark) return;
    appliedDark.current = dark;
    setReady(false);
    map.setStyle(fellBack.current ? rasterStyle(dark) : vectorStyleUrl(dark), { diff: false });
    map.once('styledata', () => setReady(true));
  }, [dark]);

  return (
    <div className={`darbi-map relative ${className}`}>
      <div ref={container} className="absolute inset-0" />
      {ready && mapRef.current ? (
        <MapContext.Provider value={mapRef.current}>{children}</MapContext.Provider>
      ) : null}
    </div>
  );
}
