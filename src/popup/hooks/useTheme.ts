import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../../lib/theme';

export interface UseTheme {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme('system'));

  useEffect(() => {
    let cancelled = false;
    void loadThemePreference().then((pref) => {
      if (cancelled) return;
      setPreferenceState(pref);
      const next = resolveTheme(pref);
      setResolved(next);
      applyTheme(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-resolve when system preference flips (only relevant for 'system').
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (preference !== 'system') return;
      const next: ResolvedTheme = mql.matches ? 'dark' : 'light';
      setResolved(next);
      applyTheme(next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    const next = resolveTheme(pref);
    setResolved(next);
    applyTheme(next);
    await saveThemePreference(pref);
  }, []);

  return { preference, resolved, setPreference };
}
