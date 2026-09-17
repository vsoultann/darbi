/** `/` — brand hero and the only credential Darbi asks for: a name and an ID (§5). */
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Search, Smartphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api';
import { DEMO_ONLY } from '@/lib/env';
import { Logo } from '@/components/shared/Logo';
import { useSettings } from '@/store/settingsStore';

const DEMO_STUDENT = { name: 'Khalid Alnuaimi', nameAr: 'خالد النعيمي', id: '123456' };

export function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const demoEnabled = useSettings((state) => state.demo.enabled);
  const [name, setName] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isArabic = i18n.language === 'ar';

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2 || studentNo.trim().length < 3) {
      setError(t('landing.errorInvalid'));
      return;
    }
    setBusy(true);
    try {
      if (DEMO_ONLY) {
        navigate(`/track/${studentNo.trim() || DEMO_STUDENT.id}`);
        return;
      }
      const result = await api.lookup(name.trim(), studentNo.trim());
      navigate(`/track/${result.studentNo}`);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      if (apiError?.status === 0) {
        // No server: Demo Mode can still run the whole journey from the bundled snapshot.
        if (demoEnabled && studentNo.trim() === DEMO_STUDENT.id) navigate(`/track/${DEMO_STUDENT.id}`);
        else setError(t('landing.errorOffline'));
      } else if (apiError?.code === 'name_mismatch') setError(t('landing.errorMismatch'));
      else setError(t('landing.errorNotFound'));
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: MapPin, title: t('landing.features.liveTitle'), body: t('landing.features.liveBody') },
    { icon: Smartphone, title: t('landing.features.islandTitle'), body: t('landing.features.islandBody') },
    { icon: Clock, title: t('landing.features.aodTitle'), body: t('landing.features.aodBody') },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:pt-14">
      <section className="darbi-pattern relative overflow-hidden rounded-3xl border bg-sand-gradient px-5 py-10 text-center shadow-warm sm:px-10 sm:py-14" style={{ borderColor: 'var(--card-border)' }}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Logo size="lg" />
          <p className="mx-auto mt-5 max-w-xl text-balance text-base sm:text-lg" style={{ color: 'var(--darbi-cocoa)' }}>
            {t('app.tagline')}
          </p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          className="darbi-card mx-auto mt-8 max-w-md p-4 text-start sm:p-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <h2 className="sr-only">{t('landing.heroTitle')}</h2>
          <label className="block">
            <span className="darbi-label">{t('landing.nameLabel')}</span>
            <input
              className="darbi-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isArabic ? DEMO_STUDENT.nameAr : t('landing.namePlaceholder')}
              autoComplete="name"
              name="studentName"
            />
          </label>
          <label className="mt-3 block">
            <span className="darbi-label">{t('landing.idLabel')}</span>
            <input
              className="darbi-input tabnum"
              value={studentNo}
              onChange={(event) => setStudentNo(event.target.value)}
              placeholder={t('landing.idPlaceholder')}
              inputMode="numeric"
              name="studentNo"
            />
          </label>

          {error ? (
            <p className="mt-3 rounded-xl bg-darbi-late/10 px-3 py-2 text-sm text-darbi-late" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="darbi-btn-primary mt-4 w-full" disabled={busy}>
            {busy ? <Search size={16} className="animate-spin" aria-hidden /> : <ArrowRight size={16} aria-hidden />}
            {busy ? t('landing.submitting') : t('landing.submit')}
          </button>

          <button
            type="button"
            className="mt-3 w-full text-center text-xs underline decoration-dotted underline-offset-4 opacity-70 transition hover:opacity-100"
            onClick={() => {
              setName(isArabic ? DEMO_STUDENT.nameAr : DEMO_STUDENT.name);
              setStudentNo(DEMO_STUDENT.id);
            }}
          >
            {t('landing.demoHint', {
              name: isArabic ? DEMO_STUDENT.nameAr : DEMO_STUDENT.name,
              id: DEMO_STUDENT.id,
            })}
          </button>
        </motion.form>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            className="darbi-card p-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 + index * 0.08 }}
          >
            <feature.icon size={18} strokeWidth={1.75} className="text-darbi-bronze" aria-hidden />
            <h3 className="mt-2 text-base">{feature.title}</h3>
            <p className="mt-1 text-sm opacity-80">{feature.body}</p>
          </motion.article>
        ))}
      </section>
    </div>
  );
}
