/** Number, time and distance formatting. Timers are tabular so digits never jitter (§3). */
import type { Lang } from '@shared/types';

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** `12:04` — the expanded island and the AOD ring both use this. */
export function formatMmSs(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}:${pad2(minutes % 60)}:${pad2(secs)}`;
  }
  return `${minutes}:${pad2(secs)}`;
}

export function etaMinutes(seconds: number): number {
  return Math.max(0, Math.ceil(seconds / 60));
}

/** `12 min` in the compact pill; under a minute it counts seconds. */
export function formatEtaShort(seconds: number, labels: { min: string; sec: string }): string {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe} ${labels.sec}`;
  return `${Math.ceil(safe / 60)} ${labels.min}`;
}

export function formatDistance(metres: number, labels: { km: string; m: string }): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} ${labels.km}`;
  return `${Math.max(0, Math.round(metres / 10) * 10)} ${labels.m}`;
}

export function clockTime(date: Date, lang: Lang): string {
  const formatted = new Intl.DateTimeFormat(lang === 'ar' ? 'en-GB' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return formatted;
}

/** The arrival wall-clock time, e.g. `07:42`. */
export function arrivalClock(etaSeconds: number, lang: Lang, from = new Date()): string {
  return clockTime(new Date(from.getTime() + Math.max(0, etaSeconds) * 1000), lang);
}

/** `Thursday 17 September · الخميس ١٧ سبتمبر` — the AOD date line (§7.1). */
export function bilingualDate(date: Date): { en: string; ar: string } {
  const en = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const ar = new Intl.DateTimeFormat('ar-AE-u-nu-arab', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    date,
  );
  return { en, ar };
}

export function localiseNumber(value: string | number, lang: Lang): string {
  return lang === 'ar' ? toArabicDigits(value) : String(value);
}

export function percent(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}
