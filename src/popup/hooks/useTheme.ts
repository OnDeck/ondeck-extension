import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

export interface UseTheme {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  cycle: () => void;
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
}

function resolvePreference(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolvePreference('system'),
  );

  // Load stored preference on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bag = await chrome.storage.local.get(STORAGE_KEY);
        const stored = bag[STORAGE_KEY] as ThemePreference | undefined;
        if (cancelled) return;
        if (stored) setPreferenceState(stored);
      } catch {
        /* storage may be unavailable in tests */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-resolve whenever preference changes OR the system theme flips.
  useEffect(() => {
    const next = resolvePreference(preference);
    setResolved(next);
    applyTheme(next);

    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const r = resolvePreference('system');
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void chrome.storage.local.set({ [STORAGE_KEY]: next }).catch(() => {});
  }, []);

  const cycle = useCallback(() => {
    setPreference(
      preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system',
    );
  }, [preference, setPreference]);

  return { preference, resolved, setPreference, cycle };
}
