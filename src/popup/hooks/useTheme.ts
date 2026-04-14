import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  let dark: boolean;
  if (pref === 'system') {
    dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    dark = pref === 'dark';
  }
  root.classList.toggle('dark', dark);
}

async function readStoredPreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage?.local?.get?.(THEME_STORAGE_KEY);
    const stored = bag?.[THEME_STORAGE_KEY] as ThemePreference | undefined;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // chrome.storage unavailable (e.g. during HMR) — fall through.
  }
  return 'system';
}

export interface UseTheme {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  ready: boolean;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readStoredPreference();
      if (cancelled) return;
      setPreferenceState(stored);
      applyTheme(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When preference is 'system', track OS changes.
  useEffect(() => {
    if (preference !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    applyTheme(pref);
    try {
      void chrome.storage?.local?.set?.({ [THEME_STORAGE_KEY]: pref });
    } catch {
      // ignore
    }
  }, []);

  return { preference, setPreference, ready };
}
