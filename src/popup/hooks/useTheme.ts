import { useCallback, useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, saveTheme, type ThemeMode } from '../../lib/theme';

export interface UseTheme {
  mode: ThemeMode;
  setMode: (next: ThemeMode) => void;
}

export function useTheme(): UseTheme {
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredTheme();
      if (cancelled) return;
      setModeState(stored);
      applyTheme(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyTheme(next);
    void saveTheme(next);
  }, []);

  return { mode, setMode };
}
