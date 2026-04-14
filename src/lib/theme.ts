export type ThemePreference = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gh_workflow_theme_v1';

export async function getStoredTheme(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(THEME_STORAGE_KEY);
    const stored = bag[THEME_STORAGE_KEY] as ThemePreference | undefined;
    if (stored === 'auto' || stored === 'light' || stored === 'dark') return stored;
  } catch {
    // chrome.storage may be unavailable in non-extension contexts
  }
  return 'auto';
}

export async function saveTheme(preference: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: preference });
  } catch {
    // swallow — not fatal
  }
}

export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'theme-auto');
  if (preference === 'dark') {
    root.classList.add('dark');
  } else if (preference === 'auto') {
    root.classList.add('theme-auto');
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    }
  }
  // 'light' uses the :root default palette.
}
