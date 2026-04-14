import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  watchSystemTheme,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../theme';

export interface UseTheme {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

export function useTheme(): UseTheme {
  const [preference, setPrefState] = useState<ThemePreference>('system');
  const [resolved, setResolvedState] = useState<ResolvedTheme>(() => resolveTheme('system'));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pref = await readThemePreference();
      if (cancelled) return;
      setPrefState(pref);
      const next = resolveTheme(pref);
      setResolvedState(next);
      applyTheme(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preference !== 'system') return;
    return watchSystemTheme((next) => {
      setResolvedState(next);
      applyTheme(next);
    });
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPrefState(pref);
    const next = resolveTheme(pref);
    setResolvedState(next);
    applyTheme(next);
    void writeThemePreference(pref);
  }, []);

  return { preference, resolved, setPreference };
}
