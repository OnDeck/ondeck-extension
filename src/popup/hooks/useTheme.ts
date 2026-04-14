import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return preference;
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolve(preference);
  if (typeof document !== 'undefined') {
    if (preference === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', resolved);
    }
  }
  return resolved;
}

async function readStoredPreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_KEY);
    const pref = bag[STORAGE_KEY] as ThemePreference | undefined;
    if (pref === 'system' || pref === 'light' || pref === 'dark') return pref;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve('system'));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pref = await readStoredPreference();
      if (cancelled) return;
      setPreference(pref);
      setResolved(applyTheme(pref));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(resolve('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setTheme = useCallback(async (next: ThemePreference) => {
    setPreference(next);
    setResolved(applyTheme(next));
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
    } catch {
      /* ignore */
    }
  }, []);

  return { preference, resolved, setTheme };
}
