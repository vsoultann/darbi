/** Everything the three island layouts render, derived once from a trip frame. */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { stateAccent, type TrackPayload, type TripUpdate } from '@shared/types';
import { formatDistance, formatEtaShort, formatMmSs } from '@/lib/format';
import { computeRouteGeometry } from '@/lib/routeGeometry';

export interface IslandView {
  accent: string;
  stateLabel: string;
  headline: string;
  mmss: string;
  etaShort: string;
  distance: string;
  progress: number;
  moving: boolean;
  approaching: boolean;
  arrived: boolean;
  delayMinutes: number;
  studentName: string;
  studentNo: string;
  fractions: Record<number, number>;
}

export function useIslandView(trip: TripUpdate | null, payload: TrackPayload | null): IslandView | null {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const geometry = useMemo(
    () => (payload ? computeRouteGeometry(payload.route.polyline, payload.stops) : null),
    [payload],
  );

  return useMemo(() => {
    if (!trip || !payload || !geometry) return null;
    const busNumber = payload.bus.id.replace(/[^0-9]/g, '') || payload.bus.id;
    const routeName = isArabic ? payload.route.name_ar : payload.route.name_en;
    const studentName = isArabic ? payload.student.name_ar : payload.student.name_en;

    return {
      accent: stateAccent(trip.state),
      stateLabel: t(`state.${trip.state}`),
      headline: `${t('track.bus')} #${busNumber} · ${routeName}`,
      mmss: formatMmSs(trip.eta_seconds),
      etaShort: formatEtaShort(trip.eta_seconds, { min: t('common.min'), sec: t('common.sec') }),
      distance: formatDistance(trip.distance_m, { km: t('common.km'), m: t('common.metres') }),
      progress: trip.progress,
      moving: trip.state === 'en_route' || trip.state === 'approaching' || trip.state === 'delayed',
      approaching: trip.eta_seconds < 180 && trip.state !== 'arrived' && trip.state !== 'idle',
      arrived: trip.state === 'arrived',
      delayMinutes: Math.round(trip.delay_seconds / 60),
      studentName: studentName.split(' ')[0],
      studentNo: payload.student.student_no,
      fractions: geometry.fractions,
    };
  }, [trip, payload, geometry, t, isArabic]);
}
