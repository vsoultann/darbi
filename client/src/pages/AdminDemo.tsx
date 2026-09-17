/**
 * `/admin/demo` — the Remote Demo Console (§8).
 *
 * Pick a live session (or broadcast), drive its timer and its interface from another
 * device, and watch a live mirror rendered from the very same feed the viewer receives.
 */
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Gauge,
  Hand,
  Languages,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Radio,
  SkipForward,
  Sparkles,
  Vibrate,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { IslandMode, Lang, TrackPayload, TripState } from '@shared/types';
import { TRIP_STATES } from '@shared/types';
import { SCENARIO_LIST } from '@/demo/scenarios';
import { ADMIN_SPEED_CHOICES, ETA_CHIPS } from '@/demo/scenarios';
import { DynamicIsland } from '@/components/island/DynamicIsland';
import { LockScreen } from '@/components/aod/LockScreen';
import { StateChip } from '@/components/shared/StateChip';
import { DeviceFrame } from '@/components/shared/DeviceFrame';
import { Field, SectionCard, Segmented } from '@/components/shared/Controls';
import { api } from '@/lib/api';
import { useAdminSocket } from '@/lib/useAdminSocket';
import { useSession } from '@/store/sessionStore';

export function AdminDemo() {
  const { t, i18n } = useTranslation();
  const token = useSession((state) => state.adminToken);
  const admin = useAdminSocket(token);
  const [payload, setPayload] = useState<TrackPayload | null>(null);
  const [etaInput, setEtaInput] = useState(720);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [notice, setNotice] = useState<string>('');
  const [notify, setNotify] = useState({
    title_en: 'Bus #3 is approaching',
    body_en: 'Two minutes away from Al Jimi Park.',
    title_ar: 'الحافلة رقم ٣ تقترب',
    body_ar: 'على بعد دقيقتين من حديقة الجيمي.',
    kind: 'info' as 'info' | 'warn' | 'success',
  });

  const selected = admin.sessions.find((session) => session.sessionCode === admin.target) ?? null;
  const isArabic = i18n.language === 'ar';

  /* The mirror needs the same static context the viewer has. */
  useEffect(() => {
    const studentNo = selected?.studentNo ?? '123456';
    api
      .track(studentNo)
      .then(setPayload)
      .catch(() => undefined);
  }, [selected?.studentNo]);

  const run = async (command: Parameters<typeof admin.send>[0], commandPayload?: Record<string, unknown>) => {
    const message = await admin.send(command, commandPayload);
    setNotice(message);
  };

  const mirrorIsLock = (selected?.route ?? '').startsWith('/lock');
  const stops = payload?.stops ?? [];

  const sessionRows = useMemo(
    () =>
      admin.sessions.map((session) => ({
        ...session,
        secondsAgo: Math.max(0, Math.round((Date.now() - session.lastSeen) / 1000)),
      })),
    [admin.sessions],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="darbi-btn-ghost px-2.5 py-1.5" aria-label={t('common.back')}>
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <div>
            <h1 className="text-xl">{t('admin.consoleTitle')}</h1>
            <p className="flex items-center gap-1.5 text-xs opacity-70">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: admin.authed ? '#2E7D5B' : '#C0503C' }}
              />
              {admin.authed ? t('admin.connected') : t('admin.disconnected')}
              {notice ? ` · ${notice}` : ''}
            </p>
          </div>
        </div>
        <button type="button" className="darbi-btn-ghost" onClick={admin.release}>
          <Hand size={15} aria-hidden />
          {t('admin.release')}
        </button>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-3">
          {/* ---- sessions ---- */}
          <SectionCard title={t('admin.sessions')}>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={admin.broadcast}
                onChange={(event) => admin.setBroadcast(event.target.checked)}
                className="h-4 w-4 accent-darbi-bronze"
              />
              {t('admin.broadcast')}
            </label>

            {sessionRows.length === 0 ? (
              <p className="py-3 text-sm opacity-70">{t('admin.noSessions')}</p>
            ) : (
              <ul className="space-y-1.5">
                {sessionRows.map((session) => {
                  const active = admin.target === session.sessionCode && !admin.broadcast;
                  return (
                    <li key={session.sessionCode}>
                      <button
                        type="button"
                        onClick={() => {
                          admin.setBroadcast(false);
                          admin.setTarget(session.sessionCode);
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-start transition ${
                          active ? 'border-darbi-bronze bg-darbi-bronze/8' : ''
                        }`}
                        style={{ borderColor: active ? undefined : 'var(--card-border)' }}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: session.secondsAgo < 15 ? '#2E7D5B' : '#E08A1E' }}
                        />
                        <span className="tabnum text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                          {session.sessionCode}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs opacity-70">
                          {session.device} · {session.browser} · {session.lang} · {session.route}
                        </span>
                        {session.controlled ? (
                          <span className="darbi-chip bg-darbi-gold/15 text-darbi-bronze">
                            <Radio size={11} aria-hidden />
                          </span>
                        ) : null}
                        <span className="tabnum shrink-0 text-[11px] opacity-60">
                          {t('admin.lastSeen', { seconds: session.secondsAgo })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* ---- timer ---- */}
          <SectionCard title={t('admin.timer')}>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="darbi-btn-primary" onClick={() => void run('trip:start')}>
                <Play size={15} aria-hidden />
                {t('admin.start')}
              </button>
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('trip:pause')}>
                <Pause size={15} aria-hidden />
                {t('admin.pause')}
              </button>
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('trip:resume')}>
                <Play size={15} aria-hidden />
                {t('admin.resume')}
              </button>
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('trip:reset')}>
                <RefreshCw size={15} aria-hidden />
                {t('admin.reset')}
              </button>
            </div>

            <Field label={t('admin.setEta')}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  className="darbi-input tabnum w-28"
                  value={etaInput}
                  min={0}
                  max={7200}
                  onChange={(event) => setEtaInput(Number(event.target.value))}
                />
                <span className="text-xs opacity-70">{t('admin.etaSeconds')}</span>
                <button
                  type="button"
                  className="darbi-btn-ghost"
                  onClick={() => void run('trip:setEta', { seconds: etaInput })}
                >
                  {t('admin.apply')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ETA_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="darbi-chip border"
                    style={{ borderColor: 'var(--card-border)' }}
                    onClick={() => {
                      setEtaInput(chip.seconds);
                      void run('trip:setEta', { seconds: chip.seconds });
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t('admin.speedMultiplier')}>
              <Segmented<number>
                value={1}
                size="sm"
                ariaLabel={t('admin.speedMultiplier')}
                onChange={(multiplier) => void run('trip:setSpeed', { multiplier })}
                options={ADMIN_SPEED_CHOICES.map((speed) => ({ value: speed, label: `${speed}×` }))}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('trip:nextStop')}>
                <SkipForward size={15} aria-hidden />
                {t('admin.skipStop')}
              </button>
              <select
                className="darbi-input w-auto py-2 text-sm"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value === '') return;
                  void run('trip:jumpToStop', { seq: Number(event.target.value) });
                }}
                aria-label={t('admin.jumpToStop')}
              >
                <option value="">{t('admin.jumpToStop')}</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.seq}>
                    {stop.seq}. {isArabic ? stop.name_ar : stop.name_en}
                  </option>
                ))}
              </select>
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('trip:arriveNow')}>
                <Sparkles size={15} aria-hidden />
                {t('admin.arriveNow')}
              </button>
            </div>
          </SectionCard>

          {/* ---- state ---- */}
          <SectionCard title={t('admin.stateGroup')}>
            <div className="flex flex-wrap gap-1.5">
              {TRIP_STATES.map((state: TripState) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => void run('trip:setState', { state })}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:border-darbi-bronze"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  {t(`state.${state}`)}
                </button>
              ))}
            </div>

            <Field label={`${t('admin.delay')} · ${t('admin.delayMinutes', { minutes: delayMinutes })}`}>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={delayMinutes}
                aria-label={t('admin.delay')}
                onChange={(event) => setDelayMinutes(Number(event.target.value))}
                onPointerUp={() => void run('trip:setDelay', { seconds: delayMinutes * 60 })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-darbi-dune accent-darbi-bronze"
              />
            </Field>
          </SectionCard>

          {/* ---- UI remote control ---- */}
          <SectionCard title={t('admin.uiControl')}>
            <Field label={t('admin.forceIsland')}>
              <Segmented<IslandMode>
                value={'compact'}
                size="sm"
                ariaLabel={t('admin.forceIsland')}
                onChange={(mode) => void run('ui:island', { mode, durationMs: 12000 })}
                options={[
                  { value: 'minimal', label: 'MINIMAL' },
                  { value: 'compact', label: 'COMPACT' },
                  { value: 'expanded', label: 'EXPANDED' },
                ]}
              />
            </Field>

            <div className="flex flex-wrap gap-2 py-1">
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('ui:aod', { enabled: true })}>
                <Lock size={15} aria-hidden />
                {t('admin.aodOn')}
              </button>
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('ui:aod', { enabled: false })}>
                {t('admin.aodOff')}
              </button>
              <button
                type="button"
                className="darbi-btn-ghost"
                onClick={() => void run('ui:haptic', { pattern: [40, 60, 40] })}
              >
                <Vibrate size={15} aria-hidden />
                {t('admin.haptic')}
              </button>
              <button type="button" className="darbi-btn-ghost" onClick={() => void run('ui:burst')}>
                <Zap size={15} aria-hidden />
                {t('admin.burst')}
              </button>
            </div>

            <Field label={t('admin.forceLang')}>
              <Segmented<Lang>
                value={'en'}
                size="sm"
                ariaLabel={t('admin.forceLang')}
                onChange={(lang) => void run('ui:lang', { lang })}
                options={[
                  { value: 'en', label: <span className="flex items-center gap-1"><Languages size={13} aria-hidden />EN</span> },
                  { value: 'ar', label: <span className="font-arabic">عربي</span> },
                ]}
              />
            </Field>

            <Field label={t('admin.notify')}>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="darbi-input"
                  value={notify.title_en}
                  onChange={(event) => setNotify({ ...notify, title_en: event.target.value })}
                  placeholder={t('admin.notifyTitleEn')}
                  aria-label={t('admin.notifyTitleEn')}
                />
                <input
                  className="darbi-input"
                  value={notify.title_ar}
                  onChange={(event) => setNotify({ ...notify, title_ar: event.target.value })}
                  placeholder={t('admin.notifyTitleAr')}
                  aria-label={t('admin.notifyTitleAr')}
                  dir="rtl"
                />
                <input
                  className="darbi-input"
                  value={notify.body_en}
                  onChange={(event) => setNotify({ ...notify, body_en: event.target.value })}
                  placeholder={t('admin.notifyBodyEn')}
                  aria-label={t('admin.notifyBodyEn')}
                />
                <input
                  className="darbi-input"
                  value={notify.body_ar}
                  onChange={(event) => setNotify({ ...notify, body_ar: event.target.value })}
                  placeholder={t('admin.notifyBodyAr')}
                  aria-label={t('admin.notifyBodyAr')}
                  dir="rtl"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Segmented<'info' | 'warn' | 'success'>
                  value={notify.kind}
                  size="sm"
                  ariaLabel={t('admin.notify')}
                  onChange={(kind) => setNotify({ ...notify, kind })}
                  options={[
                    { value: 'info', label: 'info' },
                    { value: 'warn', label: 'warn' },
                    { value: 'success', label: 'success' },
                  ]}
                />
                <button type="button" className="darbi-btn-primary" onClick={() => void run('ui:notify', notify)}>
                  <Bell size={15} aria-hidden />
                  {t('admin.send')}
                </button>
              </div>
            </Field>
          </SectionCard>

          {/* ---- scenarios ---- */}
          <SectionCard title={t('admin.scenarios')}>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCENARIO_LIST.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => void run('trip:scenario', { scenario: scenario.id })}
                  className="rounded-xl border p-3 text-start transition hover:border-darbi-bronze"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                    <Gauge size={14} className="text-darbi-bronze" aria-hidden />
                    {isArabic ? scenario.name_ar : scenario.name_en}
                  </span>
                  <span className="mt-1 block text-xs opacity-70">
                    {isArabic ? scenario.summary_ar : scenario.summary_en}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('admin.log')}>
            <ul className="max-h-48 space-y-1 overflow-auto text-xs">
              {admin.events.map((event) => (
                <li key={`${event.at}-${event.text}`} className="tabnum flex gap-2 opacity-80">
                  <span className="opacity-60">{new Date(event.at).toLocaleTimeString('en-GB')}</span>
                  <span>{event.text}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* ---- live mirror ---- */}
        <div className="lg:sticky lg:top-4 lg:h-fit">
          <SectionCard title={t('admin.mirror')} description={t('admin.mirrorHint')}>
            <div className="flex flex-col items-center gap-3">
              {admin.mirrorTrip && payload ? (
                <>
                  <div className="flex items-center gap-2">
                    <StateChip state={admin.mirrorTrip.state} compact />
                    <span className="tabnum text-xs opacity-70">
                      {Math.floor(admin.mirrorTrip.eta_seconds / 60)}:
                      {String(admin.mirrorTrip.eta_seconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <DeviceFrame
                    width={230}
                    kind={selected?.device === 'iPhone' ? 'island' : 'plain'}
                    label={mirrorIsLock ? t('admin.mirrorLock') : t('admin.mirrorTrack')}
                  >
                    {mirrorIsLock ? (
                      <LockScreen
                        trip={admin.mirrorTrip}
                        payload={payload}
                        compact
                        interactive={false}
                        reduceMotion
                      />
                    ) : (
                      <MirrorTrack payload={payload} trip={admin.mirrorTrip} />
                    )}
                  </DeviceFrame>
                </>
              ) : (
                <p className="py-6 text-sm opacity-70">{t('admin.noSessions')}</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/** A miniature of the parent's tracking screen, fed by the same trip frames. */
function MirrorTrack({ payload, trip }: { payload: TrackPayload; trip: import('@shared/types').TripUpdate }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  return (
    <div className="flex h-full w-full flex-col bg-darbi-sand p-2 pt-7">
      <div className="flex justify-center">
        <motion.div layout>
          <DynamicIsland trip={trip} payload={payload} mode="compact" embedded interactive={false} />
        </motion.div>
      </div>
      <div className="mt-3 rounded-2xl border border-darbi-dune bg-white/70 p-2.5">
        <p className="truncate text-[10px] font-semibold text-darbi-espresso">
          {isArabic ? payload.student.name_ar : payload.student.name_en}
        </p>
        <p className="tabnum mt-1 text-2xl font-semibold text-darbi-espresso">
          {Math.floor(trip.eta_seconds / 60)}:{String(trip.eta_seconds % 60).padStart(2, '0')}
        </p>
        <p className="text-[9px] uppercase tracking-wide text-darbi-cocoa">{t('track.arrivingIn')}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-darbi-dune">
          <div
            className="h-full rounded-full bg-darbi-bronze transition-all"
            style={{ width: `${Math.round(trip.progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
