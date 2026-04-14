import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (pref === 'light') root.classList.add('theme-light');
  if (pref === 'dark') root.classList.add('theme-dark');
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('auto');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const bag = await chrome.storage.local.get(STORAGE_KEY);
        if (cancelled) return;
        const stored = (bag[STORAGE_KEY] as ThemePreference | undefined) ?? 'auto';
        setPreference(stored);
        applyTheme(stored);
      } catch {
        applyTheme('auto');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(async (next: ThemePreference) => {
    setPreference(next);
    applyTheme(next);
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
    } catch {
      // best-effort persistence
    }
  }, []);

  return { preference, setTheme };
}
