// Manual theme override persisted in chrome.storage.local.
// `system` defers to prefers-color-scheme; `light` / `dark` force the palette.

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

export async function getStoredTheme(): Promise<ThemePreference> {
  const bag = await chrome.storage.local.get(THEME_STORAGE_KEY);
  const value = bag[THEME_STORAGE_KEY] as ThemePreference | undefined;
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function setStoredTheme(theme: ThemePreference): Promise<void> {
  if (theme === 'system') {
    await chrome.storage.local.remove(THEME_STORAGE_KEY);
  } else {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
  }
}

export function applyTheme(theme: ThemePreference, root: HTMLElement = document.documentElement): void {
  root.classList.remove('light', 'dark');
  if (theme === 'light' || theme === 'dark') {
    root.classList.add(theme);
  }
}
