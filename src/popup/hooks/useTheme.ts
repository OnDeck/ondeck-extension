import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
}

function systemPreference(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  return choice === 'system' ? systemPreference() : choice;
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>(() => systemPreference());

  // Initial load from chrome.storage.local.
  useEffect(() => {
    let cancelled = false;
    void chrome.storage.local.get(STORAGE_KEY).then((bag) => {
      if (cancelled) return;
      const stored = bag[STORAGE_KEY] as ThemeChoice | undefined;
      const next = stored ?? 'system';
      setChoice(next);
      const r = resolve(next);
      setResolved(r);
      applyTheme(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // When choice changes, persist + apply.
  useEffect(() => {
    const r = resolve(choice);
    setResolved(r);
    applyTheme(r);
    void chrome.storage.local.set({ [STORAGE_KEY]: choice }).catch(() => {});
  }, [choice]);

  // While in system mode, follow OS changes.
  useEffect(() => {
    if (choice !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r: ResolvedTheme = mq.matches ? 'dark' : 'light';
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [choice]);

  const cycle = useCallback(() => {
    setChoice((prev) => (prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'));
  }, []);

  return { choice, resolved, setChoice, cycle };
}
