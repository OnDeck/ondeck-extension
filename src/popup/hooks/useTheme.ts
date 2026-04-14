import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'gh_workflow_theme_v1';

function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (pref === 'light') root.classList.add('light');
  else if (pref === 'dark') root.classList.add('dark');
  // 'system' leaves both classes off; the prefers-color-scheme media
  // query in globals.css takes over.
}

export function useTheme(): {
  pref: ThemePref;
  setPref: (next: ThemePref) => void;
  cycle: () => void;
} {
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bag = await chrome.storage.local.get(STORAGE_KEY);
        const stored = (bag[STORAGE_KEY] as ThemePref | undefined) ?? 'system';
        if (cancelled) return;
        setPrefState(stored);
        applyTheme(stored);
      } catch {
        applyTheme('system');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    applyTheme(next);
    void chrome.storage.local.set({ [STORAGE_KEY]: next });
  }, []);

  const cycle = useCallback(() => {
    setPrefState((current) => {
      const order: ThemePref[] = ['system', 'light', 'dark'];
      const next = order[(order.indexOf(current) + 1) % order.length];
      applyTheme(next);
      void chrome.storage.local.set({ [STORAGE_KEY]: next });
      return next;
    });
  }, []);

  return { pref, setPref, cycle };
}
