export type ThemePreference = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(THEME_STORAGE_KEY);
    const v = bag[THEME_STORAGE_KEY] as ThemePreference | undefined;
    if (v === 'auto' || v === 'light' || v === 'dark') return v;
  } catch {
    // chrome.storage may not exist during tests — fall through.
  }
  return 'auto';
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: pref });
  } catch {
    // Non-fatal.
  }
}

/**
 * Apply the theme to `document.documentElement` by toggling one of
 * `.theme-auto` / `.theme-light` / `.theme-dark` on the root element.
 */
export function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  root.classList.add(`theme-${pref}`);
}
