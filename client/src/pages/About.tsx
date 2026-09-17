/** `/about` — the project poster, on a page (§5). */
import { motion } from 'framer-motion';
import { Cpu, Radio, Route, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/shared/Logo';
import { api } from '@/lib/api';

export function About() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ routes: 3, buses: 6, students: 24 });

  useEffect(() => {
    api
      .routes()
      .then((data) => setStats((prev) => ({ ...prev, routes: data.routes.length, buses: data.buses.length })))
      .catch(() => undefined);
  }, []);

  const sections = [
    { icon: ShieldCheck, title: t('about.problemTitle'), body: t('about.problemBody') },
    { icon: Route, title: t('about.solutionTitle'), body: t('about.solutionBody') },
    { icon: Cpu, title: t('about.techTitle'), body: t('about.techBody') },
    { icon: Radio, title: t('about.demoTitle'), body: t('about.demoBody') },
    { icon: Smartphone, title: t('about.phaseTitle'), body: t('about.phaseBody') },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
      <div className="darbi-pattern relative overflow-hidden rounded-3xl border bg-sand-gradient px-5 py-9 text-center shadow-warm" style={{ borderColor: 'var(--card-border)' }}>
        <Logo />
        <p className="mx-auto mt-4 max-w-xl text-sm opacity-85">{t('about.lead')}</p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          { value: stats.routes, label: t('about.stats.routes') },
          { value: stats.buses, label: t('about.stats.buses') },
          { value: stats.students, label: t('about.stats.students') },
          { value: '250ms', label: t('about.stats.tick') },
        ].map((stat) => (
          <div key={stat.label} className="darbi-card px-2 py-3">
            <p className="tabnum text-xl font-semibold" style={{ color: 'var(--heading)' }}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] opacity-70">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {sections.map((section, index) => (
          <motion.section
            key={section.title}
            className="darbi-card p-4 sm:p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <h2 className="flex items-center gap-2 text-lg">
              <section.icon size={18} strokeWidth={1.75} className="text-darbi-bronze" aria-hidden />
              {section.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed opacity-85">{section.body}</p>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
