/** All user preferences, persisted to localStorage and applied live (§9). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScenarioId } from '@shared/scenarios';
import type { Lang } from '@shared/types';
import type { ChromePreference } from '@/lib/device';
import { SETTINGS_STORAGE_KEY } from '@/i18n';
import { DEMO_ONLY } from '@/lib/env';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface DemoSettings {
  enabled: boolean;
  scenario: ScenarioId;
  speed: number;
  autoLoop: boolean;
  showIsland: boolean;
  autoAod: boolean;
  idleToLockSeconds: number;
  notifPreviews: boolean;
  haptics: boolean;
  studentNo: string;
}

export const DEFAULT_DEMO: DemoSettings = {
  // The static build has no server to talk to, so it starts in Demo Mode.
  enabled: DEMO_ONLY,
  scenario: 'morning_pickup',
  speed: 5,
  autoLoop: true,
  showIsland: true,
  autoAod: true,
  idleToLockSeconds: 20,
  notifPreviews: true,
  haptics: true,
  studentNo: '123456',
};

interface SettingsState {
  lang: Lang;
  theme: ThemeMode;
  reduceMotion: boolean;
  reduceChrome: boolean;
  haptics: boolean;
  notifications: boolean;
  chrome: ChromePreference;
  demo: DemoSettings;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  setChrome: (chrome: ChromePreference) => void;
  toggle: (key: 'reduceMotion' | 'reduceChrome' | 'haptics' | 'notifications') => void;
  setDemo: (patch: Partial<DemoSettings>) => void;
  resetDemo: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'en',
      theme: 'system',
      reduceMotion: false,
      reduceChrome: false,
      haptics: true,
      notifications: true,
      chrome: 'auto',
      demo: DEFAULT_DEMO,
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setChrome: (chrome) => set({ chrome }),
      toggle: (key) => set((state) => ({ ...state, [key]: !state[key] })),
      setDemo: (patch) => set((state) => ({ demo: { ...state.demo, ...patch } })),
      resetDemo: () => set({ demo: DEFAULT_DEMO }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        reduceMotion: state.reduceMotion,
        reduceChrome: state.reduceChrome,
        haptics: state.haptics,
        notifications: state.notifications,
        chrome: state.chrome,
        demo: state.demo,
      }),
    },
  ),
);

/** OS preference wins when it is set — the setting can only ever add restraint. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
