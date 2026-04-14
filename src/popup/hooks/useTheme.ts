import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

function applyThemeClass(preference: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark', 'theme-system');
  root.classList.add(`theme-${preference}`);
}

async function readPreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(THEME_STORAGE_KEY);
    const stored = bag[THEME_STORAGE_KEY] as ThemePreference | undefined;
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    /* ignore — fall through */
  }
  return 'system';
}

export function useTheme(): {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    void (async () => {
      const stored = await readPreference();
      setPreferenceState(stored);
      applyThemeClass(stored);
    })();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    applyThemeClass(next);
    try {
      await chrome.storage.local.set({ [THEME_STORAGE_KEY]: next });
    } catch {
      /* ignore */
    }
  }, []);

  return { preference, setPreference };
}
