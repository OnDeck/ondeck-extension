import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function applyPreference(pref: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (pref === 'light') root.classList.add('theme-light');
  if (pref === 'dark') root.classList.add('theme-dark');
}

async function loadPreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_KEY);
    const value = bag[STORAGE_KEY] as ThemePreference | undefined;
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // chrome.storage may be unavailable during local previews.
  }
  return 'system';
}

async function persistPreference(pref: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: pref });
  } catch {
    // Best effort — the UI still reflects the new preference in-memory.
  }
}

export interface UseTheme {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  cycle: () => void;
}

const CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadPreference();
      if (cancelled) return;
      setPreferenceState(stored);
      applyPreference(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyPreference(next);
    void persistPreference(next);
  }, []);

  const cycle = useCallback(() => {
    setPreferenceState((prev) => {
      const idx = CYCLE.indexOf(prev);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      applyPreference(next);
      void persistPreference(next);
      return next;
    });
  }, []);

  return { preference, setPreference, cycle };
}
