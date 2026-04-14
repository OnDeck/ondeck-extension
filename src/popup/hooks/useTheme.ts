import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

async function loadPreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_KEY);
    const stored = bag[STORAGE_KEY] as ThemePreference | undefined;
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* storage unavailable (e.g. tests) */
  }
  return 'system';
}

async function savePreference(pref: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: pref });
  } catch {
    /* ignore */
  }
}

export interface UseTheme {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  toggle: () => void;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() => systemTheme());

  // Load persisted preference on mount, and start watching the system
  // preference so `system` reacts in real time if the OS flips.
  useEffect(() => {
    let cancelled = false;
    void loadPreference().then((pref) => {
      if (cancelled) return;
      setPreferenceState(pref);
      const next = resolve(pref);
      setResolved(next);
      applyTheme(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const next = systemTheme();
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    const next = resolve(pref);
    setResolved(next);
    applyTheme(next);
    void savePreference(pref);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setPreference]);

  return { preference, resolved, setPreference, toggle };
}
