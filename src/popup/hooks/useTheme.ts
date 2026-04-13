import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function readSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(pref: ThemePreference, system: ResolvedTheme): ResolvedTheme {
  const resolved: ResolvedTheme = pref === 'system' ? system : pref;
  const root = document.documentElement;
  if (pref === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', resolved);
  }
  return resolved;
}

export interface UseTheme {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() => readSystemTheme());

  // Hydrate from chrome.storage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bag = await chrome.storage.local.get(STORAGE_KEY);
        const stored = bag[STORAGE_KEY] as ThemePreference | undefined;
        if (cancelled) return;
        const initial: ThemePreference = stored ?? 'system';
        setPreferenceState(initial);
        setResolved(applyTheme(initial, readSystemTheme()));
      } catch {
        // chrome.storage may be unavailable in a non-extension dev preview.
        const fallback = readSystemTheme();
        setResolved(applyTheme('system', fallback));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Watch the OS preference so a "system" pick stays in sync.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (preference === 'system') {
        setResolved(applyTheme('system', readSystemTheme()));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(applyTheme(next, readSystemTheme()));
    void chrome.storage?.local.set({ [STORAGE_KEY]: next });
  }, []);

  const toggle = useCallback(() => {
    const next: ThemePreference = resolved === 'dark' ? 'light' : 'dark';
    setPreference(next);
  }, [resolved, setPreference]);

  return { preference, resolved, setPreference, toggle };
}
