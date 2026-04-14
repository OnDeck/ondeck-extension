import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../../lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>('auto');

  useEffect(() => {
    let cancelled = false;
    void loadThemePreference().then((value) => {
      if (cancelled) return;
      setThemeState(value);
      applyTheme(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    applyTheme(next);
    void saveThemePreference(next);
  }, []);

  return { theme, setTheme };
}
