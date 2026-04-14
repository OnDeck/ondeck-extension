import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getStoredTheme,
  saveTheme,
  type ThemePreference,
} from '../../lib/theme';

export interface UseTheme {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');

  useEffect(() => {
    let cancelled = false;
    getStoredTheme().then((stored) => {
      if (cancelled) return;
      setPreferenceState(stored);
      applyTheme(stored);
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (document.documentElement.classList.contains('theme-auto')) {
        applyTheme('auto');
      }
    };
    media.addEventListener('change', handler);
    return () => {
      cancelled = true;
      media.removeEventListener('change', handler);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyTheme(next);
    void saveTheme(next);
  }, []);

  return { preference, setPreference };
}
