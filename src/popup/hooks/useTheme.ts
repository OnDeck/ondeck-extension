import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../../lib/theme';

export interface UseTheme {
  theme: ThemePreference;
  setTheme: (pref: ThemePreference) => void;
}

export function useTheme(): UseTheme {
  const [theme, setThemeState] = useState<ThemePreference>('auto');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pref = await loadThemePreference();
      if (cancelled) return;
      setThemeState(pref);
      applyTheme(pref);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((pref: ThemePreference) => {
    setThemeState(pref);
    applyTheme(pref);
    void saveThemePreference(pref);
  }, []);

  return { theme, setTheme };
}
