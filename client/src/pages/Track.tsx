/** `/track/:studentNo` — the main screen (§5). Map, rail, ETA, and the island above it. */
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, IdCard, Lock, MapPin, Navigation, Phone, Route as RouteIcon, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { CountdownDigits } from '@/components/island/CountdownDigits';
import { useIslandView } from '@/components/island/useIslandView';
import { BusMarker } from '@/components/map/BusMarker';
import { RouteLine } from '@/components/map/RouteLine';
import { StopPins } from '@/components/map/StopPins';
import { TrackMap } from '@/components/map/TrackMap';
import { StateChip } from '@/components/shared/StateChip';
import { StopRail } from '@/components/shared/StopRail';
import { arrivalClock } from '@/lib/format';
import { useTripFeed } from '@/lib/useTripFeed';
import { useIsDark } from '@/lib/useTheme';
import { prefersReducedMotion, useSettings } from '@/store/settingsStore';
import { useSession } from '@/store/sessionStore';
import { useTrip } from '@/store/tripStore';

export function Track() {
  const { studentNo } = useParams<{ studentNo: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isDark = useIsDark();
  const feed = useTripFeed(studentNo);
  const trip = useTrip((state) => state.trip);
  const source = useTrip((state) => state.source);
  const connected = useTrip((state) => state.connected);
  const sessionCode = useSession((state) => state.sessionCode);
  const demo = useSettings((state) => state.demo);
  const reduceMotion = useSettings((state) => state.reduceMotion) || prefersReducedMotion();

  const payload = feed.payload;
  const view = useIslandView(trip, payload);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [follow, setFollow] = useState(true);
  const isArabic = i18n.language === 'ar';

  /* Keep the bus in view while following. */
  useEffect(() => {
    if (!follow || !trip || !mapRef.current) return;
    mapRef.current.easeTo({ center: [trip.lng, trip.lat], duration: 900, essential: true });
  }, [follow, trip?.lng, trip?.lat, trip]);

  /* Auto-enter the AOD after a spell of no input, when Demo Mode asks for it (§7.2). */
  useEffect(() => {
    if (!demo.enabled || !demo.autoAod || !payload) return;
    let timer = window.setTimeout(() => navigate('/lock'), demo.idleToLockSeconds * 1000);
    const reset = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => navigate('/lock'), demo.idleToLockSeconds * 1000);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    for (const event of events) window.addEventListener(event, reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, reset);
    };
  }, [demo.enabled, demo.autoAod, demo.idleToLockSeconds, navigate, payload]);

  const onMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map;
  }, []);

  if (feed.loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-sm opacity-70">{t('common.loading')}</div>
    );
  }

  if (!payload || !trip || !view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl">{t('track.notFoundTitle')}</h1>
        <p className="mt-2 text-sm opacity-75">{t('track.notFoundBody')}</p>
        <Link to="/" className="darbi-btn-primary mt-5 inline-flex">
          <ArrowLeft size={16} aria-hidden />
          {t('track.backHome')}
        </Link>
      </div>
    );
  }

  const studentName = isArabic ? payload.student.name_ar : payload.student.name_en;
  const routeName = isArabic ? payload.route.name_ar : payload.route.name_en;
  const driverName = payload.driver ? (isArabic ? payload.driver.name_ar : payload.driver.name_en) : '—';
  const stops = payload.stops;
  const nextStop = stops.find((stop) => stop.seq > trip.current_stop_seq) ?? stops[stops.length - 1];
  const passed = stops.filter((stop) => stop.seq <= trip.current_stop_seq).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-3 sm:px-4">
      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border shadow-warm" style={{ borderColor: 'var(--card-border)' }}>
          <TrackMap
            route={payload.route}
            dark={isDark}
            className="h-[42dvh] w-full lg:h-[68dvh]"
            onReady={onMapReady}
          >
            <RouteLine route={payload.route} dark={isDark} />
            <StopPins
              stops={stops}
              currentSeq={trip.current_stop_seq}
              dark={isDark}
              highlightStopId={payload.student.stop_id}
            />
            <BusMarker trip={trip} reduceMotion={reduceMotion} />
          </TrackMap>

          <span
            className="darbi-chip absolute start-3 top-3 border backdrop-blur"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              color: 'var(--darbi-cocoa)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: source === 'demo' ? '#E08A1E' : connected ? '#2E7D5B' : '#C0503C' }}
            />
            {source === 'demo' ? t('track.feedDemo') : connected ? t('track.feedLive') : t('app.reconnecting')}
          </span>
          <button
            type="button"
            onClick={() => setFollow((value) => !value)}
            className="darbi-btn-ghost absolute bottom-7 end-3 backdrop-blur"
            style={{ background: 'var(--card-bg)' }}
            aria-pressed={follow}
          >
            <Navigation size={15} aria-hidden />
            {t('track.recenter')}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <motion.section
            className="darbi-card p-4 sm:p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl">{studentName}</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs opacity-75">
                  <span className="tabnum">
                    {t('track.id')} {payload.student.student_no}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{payload.student.grade}</span>
                </p>
              </div>
              <StateChip state={trip.state} />
            </div>

            <div className="mt-4 flex items-end gap-3">
              <CountdownDigits
                value={view.mmss}
                reduceMotion={reduceMotion}
                className="text-5xl font-semibold"
                ariaLabel={`${t('track.arrivingIn')} ${view.mmss}`}
              />
              <div className="pb-1.5">
                <p className="text-xs uppercase tracking-wide opacity-70">{t('track.arrivingIn')}</p>
                <p className="tabnum text-sm font-medium" style={{ color: view.accent }}>
                  {t('aod.arrives', { time: arrivalClock(trip.eta_seconds, isArabic ? 'ar' : 'en') })}
                </p>
              </div>
            </div>

            {view.delayMinutes > 0 ? (
              <p className="mt-2 rounded-xl bg-darbi-late/10 px-3 py-2 text-sm text-darbi-late">
                {t('track.delayedBy', { minutes: view.delayMinutes })}
              </p>
            ) : null}

            <div className="mt-4">
              <StopRail
                stops={stops}
                fractions={view.fractions}
                progress={trip.progress}
                currentSeq={trip.current_stop_seq}
                accent={view.accent}
                animate={!reduceMotion}
                nowLabel={t('island.now')}
              />
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs opacity-75">
                <span>{t('track.stopsPassed', { passed, total: stops.length })}</span>
                <span aria-hidden>·</span>
                <span>
                  {t('track.nextStop')}: {isArabic ? nextStop.name_ar : nextStop.name_en}
                </span>
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Detail icon={<MapPin size={14} aria-hidden />} label={t('track.distance')} value={view.distance} />
              <Detail
                icon={<Clock size={14} aria-hidden />}
                label={t('track.speed')}
                value={`${trip.speed_kmh} ${t('common.kmh')}`}
              />
              <Detail
                icon={<RouteIcon size={14} aria-hidden />}
                label={t('track.route')}
                value={routeName}
              />
              <Detail
                icon={<IdCard size={14} aria-hidden />}
                label={t('track.plate')}
                value={payload.bus.plate}
              />
              <Detail icon={<User size={14} aria-hidden />} label={t('track.driver')} value={driverName} />
              <Detail
                icon={<Phone size={14} aria-hidden />}
                label={t('track.guardian')}
                value={payload.student.guardian_phone}
              />
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/lock" className="darbi-btn-primary">
                <Lock size={15} aria-hidden />
                {t('track.openLockScreen')}
              </Link>
              {payload.driver ? (
                <a href={`tel:${payload.driver.phone.replace(/\s/g, '')}`} className="darbi-btn-ghost">
                  <Phone size={15} aria-hidden />
                  {t('track.callDriver')}
                </a>
              ) : null}
            </div>

            {sessionCode ? (
              <p className="mt-3 text-[11px] opacity-60">
                {t('track.sessionCode')} <span className="tabnum font-semibold">{sessionCode}</span>
              </p>
            ) : null}
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide opacity-65">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium" style={{ color: 'var(--heading)' }}>
        {value}
      </dd>
    </div>
  );
}
