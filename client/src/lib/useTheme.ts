/** Resolves the theme setting to a boolean and keeps the `dark` class on <html>. */
import { useEffect, useState } from 'react';
import { useSettings } from '@/store/settingsStore';

export function useIsDark(): boolean {
  const theme = useSettings((state) => state.theme);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent): void => setSystemDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return theme === 'dark' || (theme === 'system' && systemDark);
}

export function useApplyTheme(): boolean {
  const isDark = useIsDark();
  const reduceMotion = useSettings((state) => state.reduceMotion);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#1A120B' : '#A67C3D');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return isDark;
}
