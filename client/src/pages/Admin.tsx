/** `/admin` — PIN gate (§8.4) and the fleet dashboard. The console lives at /admin/demo. */
import { KeyRound, LogOut, Radio, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, ApiError, type AdminOverview } from '@/lib/api';
import { StateChip } from '@/components/shared/StateChip';
import { SectionCard } from '@/components/shared/Controls';
import { useSession } from '@/store/sessionStore';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const token = useSession((state) => state.adminToken);
  const setToken = useSession((state) => state.setAdminToken);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) return <>{children}</>;

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.adminLogin(pin);
      setToken(result.token);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      setError(apiError?.status === 429 ? t('admin.rateLimited', { seconds: 600 }) : t('admin.wrongPin'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <form onSubmit={submit} className="darbi-card p-5">
        <h1 className="flex items-center gap-2 text-xl">
          <KeyRound size={18} className="text-darbi-bronze" aria-hidden />
          {t('admin.title')}
        </h1>
        <label className="mt-4 block">
          <span className="darbi-label">{t('admin.pinLabel')}</span>
          <input
            className="darbi-input tabnum text-center text-2xl tracking-[0.4em]"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t('admin.pinPlaceholder')}
          />
        </label>
        {error ? (
          <p className="mt-3 rounded-xl bg-darbi-late/10 px-3 py-2 text-sm text-darbi-late" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="darbi-btn-primary mt-4 w-full" disabled={busy}>
          {t('admin.enter')}
        </button>
      </form>
    </div>
  );
}

export function Admin() {
  const { t, i18n } = useTranslation();
  const token = useSession((state) => state.adminToken);
  const setToken = useSession((state) => state.setAdminToken);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    if (!token) return;
    const load = (): void => {
      api
        .adminOverview(token)
        .then(setOverview)
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 px-4 pb-16 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-2xl">{t('admin.title')}</h1>
          <p className="text-sm opacity-70">
            {overview?.school ? (isArabic ? overview.school.name_ar : overview.school.name_en) : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/demo" className="darbi-btn-primary">
            <Radio size={15} aria-hidden />
            {t('admin.consoleTitle')}
          </Link>
          <button type="button" className="darbi-btn-ghost" onClick={() => setToken(null)}>
            <LogOut size={15} aria-hidden />
            {t('admin.signOut')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {[
          { value: overview?.buses.length ?? 0, label: t('admin.buses') },
          { value: overview?.students ?? 0, label: t('about.stats.students') },
          { value: overview?.sessions ?? 0, label: t('admin.sessions') },
        ].map((stat) => (
          <div key={stat.label} className="darbi-card px-3 py-3 text-center">
            <p className="tabnum text-2xl font-semibold" style={{ color: 'var(--heading)' }}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] opacity-70">{stat.label}</p>
          </div>
        ))}
      </div>

      <SectionCard title={t('admin.overview')}>
        <ul className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {(overview?.buses ?? []).map((entry) => (
            <li key={entry.bus.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--heading)' }}>
                  {t('track.bus')} #{entry.bus.id.replace(/\D/g, '')} · {entry.route ? (isArabic ? entry.route.name_ar : entry.route.name_en) : ''}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs opacity-70">
                  <span className="tabnum">{entry.bus.plate}</span>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} aria-hidden />
                    {entry.students} {t('admin.studentsOnBoard')}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {entry.update ? (
                  <span className="tabnum text-xs opacity-70">
                    {Math.ceil(entry.update.eta_seconds / 60)} {t('common.min')}
                  </span>
                ) : null}
                {entry.update ? <StateChip state={entry.update.state} compact /> : null}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
