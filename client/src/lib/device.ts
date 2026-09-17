/**
 * Device chrome detection.
 *
 * iPhones get a live activity shaped like their own hardware: the pill for Dynamic
 * Island models (14 Pro and newer), and a status-bar / ears treatment that grows out of
 * the NOTCH for iPhone X through 14. Every other device — Android, tablets, desktop —
 * gets the floating pill, because only iPhones have these cutouts.
 */

export type ChromeKind = 'island' | 'notch' | 'plain';
export type ChromePreference = 'auto' | ChromeKind;

/** Portrait CSS sizes, [short, long]. */
const ISLAND_SIZES: Array<[number, number]> = [
  [393, 852], // 14 Pro · 15 · 15 Pro · 16
  [430, 932], // 14 Pro Max · 15 Plus · 15 Pro Max · 16 Plus
  [402, 874], // 16 Pro
  [440, 956], // 16 Pro Max
];

const NOTCH_SIZES: Array<[number, number]> = [
  [375, 812], // X · XS · 11 Pro · 12 mini · 13 mini
  [414, 896], // XR · XS Max · 11 · 11 Pro Max
  [390, 844], // 12 · 12 Pro · 13 · 13 Pro · 14
  [428, 926], // 12 Pro Max · 13 Pro Max · 14 Plus
];

export function isIPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone/i.test(navigator.userAgent);
}

/**
 * Reads `env(safe-area-inset-top)` in real pixels. Needs `viewport-fit=cover`, which
 * index.html sets. Returns 0 when the browser has no notion of safe areas.
 */
export function readSafeAreaTop(): number {
  if (typeof document === 'undefined' || !document.body) return 0;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return value;
}

function matchesSize(list: Array<[number, number]>): boolean {
  if (typeof screen === 'undefined') return false;
  const short = Math.min(screen.width, screen.height);
  const long = Math.max(screen.width, screen.height);
  return list.some(([a, b]) => Math.abs(a - short) <= 2 && Math.abs(b - long) <= 2);
}

/**
 * Known model sizes first (exact), then the safe-area inset (future-proof):
 * Dynamic Island phones report ~59px, notched phones 44–48px, everything else ≤ 20px.
 */
export function detectChrome(): ChromeKind {
  if (!isIPhone()) return 'plain';
  if (matchesSize(ISLAND_SIZES)) return 'island';
  if (matchesSize(NOTCH_SIZES)) return 'notch';
  const inset = readSafeAreaTop();
  if (inset >= 55) return 'island';
  if (inset >= 34) return 'notch';
  return 'plain';
}

export interface ChromeMetrics {
  kind: ChromeKind;
  /** Height of the black status strip the activity lives in. */
  barHeight: number;
  cutoutWidth: number;
  cutoutHeight: number;
  /** Distance from the top of the screen to the top of the cutout. */
  cutoutTop: number;
  cutoutRadius: number;
}

const DEFAULT_METRICS: Record<ChromeKind, ChromeMetrics> = {
  island: { kind: 'island', barHeight: 59, cutoutWidth: 126, cutoutHeight: 37, cutoutTop: 11, cutoutRadius: 19 },
  notch: { kind: 'notch', barHeight: 47, cutoutWidth: 162, cutoutHeight: 32, cutoutTop: 0, cutoutRadius: 20 },
  plain: { kind: 'plain', barHeight: 0, cutoutWidth: 0, cutoutHeight: 0, cutoutTop: 0, cutoutRadius: 0 },
};

export function chromeMetrics(kind: ChromeKind, safeAreaTop = 0): ChromeMetrics {
  const base = DEFAULT_METRICS[kind];
  if (kind === 'plain' || safeAreaTop <= 20) return base;
  // Trust the device over the table when it tells us its own inset.
  return { ...base, barHeight: Math.round(safeAreaTop) };
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Device';
  const ua = navigator.userAgent;
  const device = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? 'Android'
        : 'Desktop';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${device} · ${browser}`;
}
