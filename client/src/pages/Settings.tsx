/** `/settings` — language, appearance, motion, and the self-serve Demo Mode panel (§9). */
import { Copy, Languages, MonitorSmartphone, Moon, Radio, Sliders, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SCENARIO_LIST, SPEED_CHOICES } from '@/demo/scenarios';
import { resetActiveEngine } from '@/demo/activeEngine';
import { applyDirection } from '@/i18n';
import { api } from '@/lib/api';
import { Field, SectionCard, Segmented, Slider, Switch } from '@/components/shared/Controls';
import { useDeviceChrome } from '@/lib/useDeviceChrome';
import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useToasts } from '@/store/toastStore';
import type { Lang } from '@shared/types';
import type { ScenarioId } from '@shared/scenarios';

export function Settings() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const sessionCode = useSession((state) => state.sessionCode);
  const pushSimple = useToasts((state) => state.pushSimple);
  const device = useDeviceChrome(settings.chrome);
  const isArabic = i18n.language === 'ar';
  const [demoStudents, setDemoStudents] = useState<Array<{ student_no: string; name_en: string; name_ar: string }>>(
    [],
  );

  useEffect(() => {
    api
      .demoStudents()
      .then((data) => setDemoStudents(data.students))
      .catch(() => setDemoStudents([{ student_no: '123456', name_en: 'Khalid Alnuaimi', name_ar: 'خالد النعيمي' }]));
  }, []);

  const changeLang = (lang: Lang): void => {
    settings.setLang(lang);
    void i18n.changeLanguage(lang);
    applyDirection(lang);
  };

  const detectedLabel =
    device.detected === 'island'
      ? t('chrome.deviceIsland')
      : device.detected === 'notch'
        ? t('chrome.deviceNotch')
        : t('chrome.devicePlain');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pb-16 pt-6">
      <header className="px-1">
        <h1 className="text-2xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm opacity-75">{t('settings.subtitle')}</p>
      </header>

      <SectionCard title={t('settings.language')}>
        <Segmented<Lang>
          value={settings.lang}
          onChange={changeLang}
          ariaLabel={t('settings.language')}
          options={[
            { value: 'en', label: <span className="flex items-center gap-1.5"><Languages size={14} aria-hidden /> English</span> },
            { value: 'ar', label: <span className="font-arabic">العربية</span> },
          ]}
        />
      </SectionCard>

      <SectionCard title={t('settings.appearance')}>
        <Segmented
          value={settings.theme}
          onChange={settings.setTheme}
          ariaLabel={t('settings.appearance')}
          options={[
            { value: 'light', label: <span className="flex items-center gap-1.5"><Sun size={14} aria-hidden />{t('settings.themeLight')}</span> },
            { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon size={14} aria-hidden />{t('settings.themeDark')}</span> },
            { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor size={14} aria-hidden />{t('settings.themeSystem')}</span> },
          ]}
        />
      </SectionCard>

      <SectionCard title={t('chrome.title')} description={t('chrome.hint')}>
        <Segmented
          value={settings.chrome}
          onChange={settings.setChrome}
          ariaLabel={t('chrome.title')}
          options={[
            { value: 'auto', label: t('chrome.auto') },
            { value: 'island', label: t('chrome.island') },
            { value: 'notch', label: t('chrome.notch') },
            { value: 'plain', label: t('chrome.plain') },
          ]}
        />
        <p className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
          <MonitorSmartphone size={13} aria-hidden />
          {t('chrome.detected', { value: detectedLabel })}
        </p>
      </SectionCard>

      <SectionCard title={t('settings.accessibility')}>
        <Switch
          checked={settings.reduceMotion}
          onChange={() => settings.toggle('reduceMotion')}
          label={t('settings.reduceMotion')}
          hint={t('settings.reduceMotionHint')}
        />
        <Switch
          checked={settings.reduceChrome}
          onChange={() => settings.toggle('reduceChrome')}
          label={t('settings.reduceChrome')}
          hint={t('settings.reduceChromeHint')}
        />
        <Switch checked={settings.haptics} onChange={() => settings.toggle('haptics')} label={t('settings.haptics')} />
        <Switch
          checked={settings.notifications}
          onChange={() => settings.toggle('notifications')}
          label={t('settings.notifications')}
        />
      </SectionCard>

      <SectionCard
        title={t('settings.demoTitle')}
        description={t('settings.demoHint')}
        action={
          settings.demo.enabled ? (
            <span className="darbi-chip bg-darbi-soon/15 text-darbi-soon">
              <Radio size={12} aria-hidden />
              {t('app.demoChip')}
            </span>
          ) : null
        }
      >
        <Switch
          checked={settings.demo.enabled}
          onChange={(value) => settings.setDemo({ enabled: value })}
          label={t('settings.demoEnable')}
        />

        <div className={settings.demo.enabled ? '' : 'pointer-events-none opacity-45'}>
          <Field label={t('settings.scenario')}>
            <select
              className="darbi-input"
              value={settings.demo.scenario}
              onChange={(event) => settings.setDemo({ scenario: event.target.value as ScenarioId })}
            >
              {SCENARIO_LIST.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {isArabic ? scenario.name_ar : scenario.name_en}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs opacity-70">
              {isArabic
                ? SCENARIO_LIST.find((s) => s.id === settings.demo.scenario)?.summary_ar
                : SCENARIO_LIST.find((s) => s.id === settings.demo.scenario)?.summary_en}
            </p>
          </Field>

          <Field label={t('settings.speed')}>
            <Segmented<number>
              value={settings.demo.speed}
              onChange={(speed) => settings.setDemo({ speed })}
              ariaLabel={t('settings.speed')}
              size="sm"
              options={SPEED_CHOICES.map((speed) => ({ value: speed, label: `${speed}×` }))}
            />
          </Field>

          <Switch
            checked={settings.demo.autoLoop}
            onChange={(autoLoop) => settings.setDemo({ autoLoop })}
            label={t('settings.autoLoop')}
          />
          <Switch
            checked={settings.demo.showIsland}
            onChange={(showIsland) => settings.setDemo({ showIsland })}
            label={t('settings.showIsland')}
          />
          <Switch
            checked={settings.demo.autoAod}
            onChange={(autoAod) => settings.setDemo({ autoAod })}
            label={t('settings.autoAod')}
          />

          <Field label={`${t('settings.idleSeconds')} · ${settings.demo.idleToLockSeconds}s`}>
            <Slider
              value={settings.demo.idleToLockSeconds}
              min={10}
              max={120}
              step={5}
              ariaLabel={t('settings.idleSeconds')}
              onChange={(idleToLockSeconds) => settings.setDemo({ idleToLockSeconds })}
            />
          </Field>

          <Switch
            checked={settings.demo.notifPreviews}
            onChange={(notifPreviews) => settings.setDemo({ notifPreviews })}
            label={t('settings.notifications')}
          />
          <Switch
            checked={settings.demo.haptics}
            onChange={(haptics) => settings.setDemo({ haptics })}
            label={t('settings.haptics')}
          />

          <Field label={t('settings.demoStudent')}>
            <select
              className="darbi-input"
              value={settings.demo.studentNo}
              onChange={(event) => settings.setDemo({ studentNo: event.target.value })}
            >
              {demoStudents.map((student) => (
                <option key={student.student_no} value={student.student_no}>
                  {(isArabic ? student.name_ar : student.name_en) + ` · ${student.student_no}`}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            className="darbi-btn-ghost mt-2"
            onClick={() => {
              resetActiveEngine();
              pushSimple(t('settings.resetDone'), 'success');
            }}
          >
            <Sliders size={15} aria-hidden />
            {t('settings.resetDemo')}
          </button>
        </div>
      </SectionCard>

      <SectionCard title={t('settings.session')} description={t('settings.sessionHint')}>
        {sessionCode ? (
          <button
            type="button"
            className="darbi-btn-ghost tabnum text-base font-semibold"
            onClick={() => {
              void navigator.clipboard?.writeText(sessionCode);
              pushSimple(t('common.copied'), 'success');
            }}
          >
            <Copy size={15} aria-hidden />
            {sessionCode}
          </button>
        ) : (
          <p className="text-sm opacity-70">{t('settings.notConnected')}</p>
        )}
      </SectionCard>
    </div>
  );
}
