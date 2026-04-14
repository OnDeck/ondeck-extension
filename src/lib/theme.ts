// Theme management. Users can pick between three modes:
//   - 'system' (default): follow prefers-color-scheme
//   - 'light'           : force the light Primer palette
//   - 'dark'            : force the dark Primer palette
// The choice is persisted in chrome.storage.local and applied by
// toggling classes on <html>.

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

export async function getStoredTheme(): Promise<ThemeMode> {
  try {
    const bag = await chrome.storage.local.get(THEME_STORAGE_KEY);
    const value = bag[THEME_STORAGE_KEY];
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    return 'system';
  } catch {
    return 'system';
  }
}

export async function saveTheme(mode: ThemeMode): Promise<void> {
  await chrome.storage.local.set({ [THEME_STORAGE_KEY]: mode });
}

/**
 * Apply a theme mode to the document root. Removes any existing
 * theme-* class first so toggling is idempotent.
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (mode === 'light') root.classList.add('theme-light');
  if (mode === 'dark') root.classList.add('theme-dark');
  // For 'system' we leave both classes off and the media query in
  // globals.css handles it.
}
