import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Lang } from '@shared/types';
import ar from './ar.json';
import en from './en.json';

export const SETTINGS_STORAGE_KEY = 'darbi.settings';

function initialLang(): Lang {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { lang?: string } };
      if (parsed.state?.lang === 'ar' || parsed.state?.lang === 'en') return parsed.state.lang;
    }
  } catch {
    /* private mode, or a corrupt value — fall through to the browser hint */
  }
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

/** Arabic flips the whole document, not just the text (§12.1). */
export function applyDirection(lang: Lang): void {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDirection(i18n.language as Lang);

export default i18n;
