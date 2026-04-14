// Theme token + persistence helpers.
//
// We expose three states:
//   - 'system' (default): track prefers-color-scheme
//   - 'light': force the Primer light palette
//   - 'dark':  force the Primer dark palette
// The resolved palette is applied by setting the `data-theme` attribute on
// <html>; see `tailwind.config.js` and `src/styles/globals.css`.

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

export async function loadThemePreference(): Promise<ThemePreference> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return 'system';
  const bag = await chrome.storage.local.get(STORAGE_KEY);
  const value = bag[STORAGE_KEY];
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({ [STORAGE_KEY]: pref });
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}
