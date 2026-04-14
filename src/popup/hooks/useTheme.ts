import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  type ThemePreference,
} from '../../lib/theme';

export interface UseTheme {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => Promise<void>;
}

export function useTheme(): UseTheme {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredTheme();
      if (cancelled) return;
      setThemeState(stored);
      applyTheme(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(async (next: ThemePreference) => {
    setThemeState(next);
    applyTheme(next);
    await setStoredTheme(next);
  }, []);

  return { theme, setTheme };
}
