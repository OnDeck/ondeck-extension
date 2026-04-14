import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function systemTheme(): ResolvedTheme {
  if (typeof matchMedia === 'undefined') return 'dark';
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(resolved === 'light' ? 'theme-light' : 'theme-dark');
}

async function readPreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_KEY);
    const value = bag[STORAGE_KEY] as ThemePreference | undefined;
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // ignore — fall back to system
  }
  return 'system';
}

async function writePreference(preference: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: preference });
  } catch {
    // best effort
  }
}

export interface UseTheme {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  cycle: () => void;
}

export function useTheme(): UseTheme {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() => systemTheme());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readPreference();
      if (cancelled) return;
      setPreferenceState(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next: ResolvedTheme = preference === 'system' ? systemTheme() : preference;
    setResolved(next);
    applyTheme(next);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system' || typeof matchMedia === 'undefined') return;
    const media = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const next: ResolvedTheme = media.matches ? 'light' : 'dark';
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writePreference(next);
  }, []);

  const cycle = useCallback(() => {
    setPreferenceState((prev) => {
      const next: ThemePreference =
        prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system';
      void writePreference(next);
      return next;
    });
  }, []);

  return { preference, resolved, setPreference, cycle };
}
