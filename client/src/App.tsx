/** App shell: header, routes, the persistent island, toasts and the remote AOD bridge. */
import { useEffect } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bus, Info, KeyRound, Languages, Settings as SettingsIcon } from 'lucide-react';
import type { Lang } from '@shared/types';
import { DynamicIsland } from '@/components/island/DynamicIsland';
import { GooeyFilter } from '@/components/island/GooeyFilter';
import { Logo } from '@/components/shared/Logo';
import { ToastHost } from '@/components/shared/Toast';
import { applyDirection } from '@/i18n';
import { DEMO_ONLY } from '@/lib/env';
import { useDeviceChrome } from '@/lib/useDeviceChrome';
import { useApplyTheme } from '@/lib/useTheme';
import { setHapticsEnabled } from '@/lib/haptics';
import { About } from '@/pages/About';
import { Admin, AdminGate } from '@/pages/Admin';
import { AdminDemo } from '@/pages/AdminDemo';
import { Driver } from '@/pages/Driver';
import { Landing } from '@/pages/Landing';
import { Lock } from '@/pages/Lock';
import { Settings } from '@/pages/Settings';
import { Track } from '@/pages/Track';
import { useSettings } from '@/store/settingsStore';
import { useTrip } from '@/store/tripStore';

export function App() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const settings = useSettings();
  const device = useDeviceChrome(settings.chrome);
  useApplyTheme();

  const isLock = location.pathname.startsWith('/lock');
  const isTrack = location.pathname.startsWith('/track');

  useEffect(() => {
    applyDirection(settings.lang);
    if (i18n.language !== settings.lang) void i18n.changeLanguage(settings.lang);
  }, [settings.lang, i18n]);

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  // The notch shell owns the top strip of the screen, so the page starts below it.
  const notchPadding = isTrack && device.kind === 'notch' ? device.metrics.barHeight : 0;

  return (
    <div className="min-h-dvh">
      <GooeyFilter />
      <RemoteAodBridge />

      {!isLock ? <Header /> : null}

      <main style={{ paddingTop: notchPadding }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/track/:studentNo" element={<Track />} />
          <Route path="/lock" element={<Lock />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/admin"
            element={
              <AdminGate>
                <Admin />
              </AdminGate>
            }
          />
          <Route
            path="/admin/demo"
            element={
              <AdminGate>
                <AdminDemo />
              </AdminGate>
            }
          />
          <Route path="/driver" element={<Driver />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>

      {/* Mounted for the whole of /track/* so it survives in-app navigation (§6.5). */}
      {isTrack ? <DynamicIsland /> : null}
      {!isLock ? <ToastHost offsetTop={device.kind === 'notch' ? device.metrics.barHeight + 56 : 96} /> : null}
    </div>
  );
}

function Header() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const demoEnabled = useSettings((state) => state.demo.enabled);

  const toggleLang = (): void => {
    const next: Lang = settings.lang === 'ar' ? 'en' : 'ar';
    settings.setLang(next);
    void i18n.changeLanguage(next);
    applyDirection(next);
  };

  return (
    <header className="safe-top sticky top-0 z-30 border-b backdrop-blur" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--page-bg) 86%, transparent)' }}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
        <Link to="/" aria-label={t('nav.home')}>
          <Logo size="sm" stacked={false} />
        </Link>

        <nav className="flex items-center gap-1">
          {demoEnabled ? (
            <span className="darbi-chip mr-1 bg-darbi-soon/15 text-darbi-soon" title={t('app.demoChipTitle')}>
              {t('app.demoChip')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={toggleLang}
            className="darbi-btn-ghost px-2.5 py-1.5"
            aria-label={t('settings.language')}
          >
            <Languages size={16} aria-hidden />
            <span className="hidden text-xs sm:inline">{settings.lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
          <Link to="/about" className="darbi-btn-ghost px-2.5 py-1.5" aria-label={t('nav.about')}>
            <Info size={16} aria-hidden />
          </Link>
          {/* The static build has no server, so the authenticated views are hidden. */}
          {DEMO_ONLY ? null : (
            <>
              <Link to="/driver" className="darbi-btn-ghost px-2.5 py-1.5" aria-label={t('nav.driver')}>
                <Bus size={16} aria-hidden />
              </Link>
              <Link to="/admin" className="darbi-btn-ghost px-2.5 py-1.5" aria-label={t('nav.admin')}>
                <KeyRound size={16} aria-hidden />
              </Link>
            </>
          )}
          <Link to="/settings" className="darbi-btn-ghost px-2.5 py-1.5" aria-label={t('nav.settings')}>
            <SettingsIcon size={16} aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Lets the admin console push a viewer onto the lock screen and back (§8.2). */
function RemoteAodBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const aodRequest = useTrip((state) => state.aodRequest);
  const clearAodRequest = useTrip((state) => state.clearAodRequest);
  const payload = useTrip((state) => state.payload);

  useEffect(() => {
    if (!aodRequest) return;
    const onLock = location.pathname.startsWith('/lock');
    if (aodRequest.enabled && !onLock) navigate('/lock');
    if (!aodRequest.enabled && onLock) navigate(`/track/${payload?.student.student_no ?? '123456'}`);
    clearAodRequest();
  }, [aodRequest, clearAodRequest, location.pathname, navigate, payload]);

  return null;
}
