export type ThemePreference = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  root.classList.add(`theme-${theme}`);
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(THEME_STORAGE_KEY);
    const value = bag[THEME_STORAGE_KEY];
    if (value === 'light' || value === 'dark' || value === 'auto') return value;
  } catch {
    // chrome.storage may be unavailable in dev preview.
  }
  return 'auto';
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
  } catch {
    // Ignore — the in-memory state is still correct.
  }
}
