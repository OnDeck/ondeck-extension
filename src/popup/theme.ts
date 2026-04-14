// Theme runtime: resolves the active light/dark mode from chrome.storage
// or the system preference, applies it to <html>, and exposes a toggle.

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gh_workflow_theme_v1';

export async function readThemePreference(): Promise<ThemePreference> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_KEY);
    const value = bag[STORAGE_KEY];
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // chrome.storage may not be available in non-extension contexts
    // (e.g. during tests) — fall through to the system default.
  }
  return 'system';
}

export async function writeThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: pref });
  } catch {
    // Swallow — see readThemePreference.
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/** Listen for system-preference changes while the popup is open. */
export function watchSystemTheme(cb: (next: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => cb(e.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
