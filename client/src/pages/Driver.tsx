/** `/driver` — start and end trips, mark stops, report delays (§5). */
import { Flag, KeyRound, LogOut, MapPin, Play, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type DriverBuses } from '@/lib/api';
import { SectionCard } from '@/components/shared/Controls';
import { StateChip } from '@/components/shared/StateChip';
import { useSession } from '@/store/sessionStore';
import { useToasts } from '@/store/toastStore';

export function Driver() {
  const { t, i18n } = useTranslation();
  const token = useSession((state) => state.driverToken);
  const setToken = useSession((state) => state.setDriverToken);
  const pushSimple = useToasts((state) => state.pushSimple);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DriverBuses | null>(null);
  const [busId, setBusId] = useState<string>('bus-3');
  const [delayMinutes, setDelayMinutes] = useState(5);
  const isArabic = i18n.language === 'ar';

  const load = useCallback(() => {
    if (!token) return;
    api
      .driverBuses(token)
      .then(setData)
      .catch(() => setToken(null));
  }, [token, setToken]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const signIn = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      const result = await api.driverLogin(pin);
      setToken(result.token);
    } catch {
      setError(t('driver.wrongPin'));
    }
  };

  const act = async (action: string, body: Record<string, unknown> = {}): Promise<void> => {
    if (!token) return;
    await api.driverAction(token, busId, action, body);
    pushSimple(t('driver.actionDone'), 'success');
    load();
  };

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-16">
        <form onSubmit={signIn} className="darbi-card p-5">
          <h1 className="flex items-center gap-2 text-xl">
            <KeyRound size={18} className="text-darbi-bronze" aria-hidden />
            {t('driver.title')}
          </h1>
          <label className="mt-4 block">
            <span className="darbi-label">{t('driver.pinLabel')}</span>
            <input
              className="darbi-input tabnum text-center text-2xl tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-darbi-late">{error}</p> : null}
          <button type="submit" className="darbi-btn-primary mt-4 w-full">
            {t('driver.enter')}
          </button>
        </form>
      </div>
    );
  }

  const selected = data?.buses.find((entry) => entry.bus.id === busId) ?? data?.buses[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pb-16 pt-6">
      <header className="flex items-center justify-between px-1">
        <h1 className="text-2xl">{t('driver.title')}</h1>
        <button type="button" className="darbi-btn-ghost" onClick={() => setToken(null)}>
          <LogOut size={15} aria-hidden />
          {t('driver.signOut')}
        </button>
      </header>

      <SectionCard title={t('driver.selectBus')}>
        <div className="flex flex-wrap gap-1.5">
          {(data?.buses ?? []).map((entry) => (
            <button
              key={entry.bus.id}
              type="button"
              onClick={() => setBusId(entry.bus.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                entry.bus.id === busId ? 'border-darbi-bronze bg-darbi-bronze/10' : ''
              }`}
              style={{ borderColor: entry.bus.id === busId ? undefined : 'var(--card-border)' }}
            >
              #{entry.bus.id.replace(/\D/g, '')}
            </button>
          ))}
        </div>
      </SectionCard>

      {selected ? (
        <SectionCard
          title={`${t('track.bus')} #${selected.bus.id.replace(/\D/g, '')}`}
          description={selected.route ? (isArabic ? selected.route.name_ar : selected.route.name_en) : ''}
          action={selected.update ? <StateChip state={selected.update.state} compact /> : null}
        >
          <div className="flex flex-wrap items-center gap-3 text-xs opacity-75">
            <span className="tabnum">{selected.bus.plate}</span>
            <span className="flex items-center gap-1">
              <Users size={13} aria-hidden />
              {t('driver.students', { count: selected.students })}
            </span>
            {selected.update ? (
              <span className="flex items-center gap-1">
                <MapPin size={13} aria-hidden />
                {t('driver.currentStop')}:{' '}
                {(() => {
                  const stop = selected.stops.find((s) => s.seq === selected.update?.current_stop_seq);
                  return stop ? (isArabic ? stop.name_ar : stop.name_en) : '—';
                })()}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="darbi-btn-primary" onClick={() => void act('start')}>
              <Play size={15} aria-hidden />
              {t('driver.startTrip')}
            </button>
            <button type="button" className="darbi-btn-ghost" onClick={() => void act('stop-reached')}>
              <MapPin size={15} aria-hidden />
              {t('driver.markStop')}
            </button>
            <button type="button" className="darbi-btn-ghost" onClick={() => void act('end')}>
              <Flag size={15} aria-hidden />
              {t('driver.endTrip')}
            </button>
            <button type="button" className="darbi-btn-ghost" onClick={() => void act('reset')}>
              <RefreshCw size={15} aria-hidden />
              {t('driver.resetTrip')}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="number"
              className="darbi-input tabnum w-24"
              min={0}
              max={60}
              value={delayMinutes}
              onChange={(event) => setDelayMinutes(Number(event.target.value))}
              aria-label={t('driver.reportDelay')}
            />
            <span className="text-xs opacity-70">{t('common.min')}</span>
            <button type="button" className="darbi-btn-ghost" onClick={() => void act('delay', { minutes: delayMinutes })}>
              {t('driver.reportDelay')}
            </button>
            <button type="button" className="darbi-btn-ghost" onClick={() => void act('delay', { minutes: 0 })}>
              {t('driver.clearDelay')}
            </button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
