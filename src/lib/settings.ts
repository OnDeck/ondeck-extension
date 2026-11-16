import type { UserSettings } from '../shared/settings/types';
import { DEFAULT_SETTINGS } from '../shared/settings/defaults';

const SETTINGS_KEY = 'settings';

/**
 * Get user settings from chrome.storage.sync, merged with defaults
 */
export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY];

  if (!stored) {
    return structuredClone(DEFAULT_SETTINGS);
  }

  // Deep merge with defaults to handle missing keys from schema updates
  return {
    sync: {
      ...DEFAULT_SETTINGS.sync,
      ...stored.sync,
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...stored.notifications,
    },
  };
}

const LEGACY_SETTINGS_BLOCKS = ['badge', 'display', 'filters'];

/**
 * Rewrite stored settings without blocks from removed features. getSettings
 * already ignores them; this just stops them riding along in sync storage.
 */
export async function pruneLegacySettings(): Promise<void> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as Record<string, unknown> | undefined;
  if (!stored || !LEGACY_SETTINGS_BLOCKS.some((key) => key in stored)) return;
  await saveSettings(await getSettings());
}

/**
 * Save user settings to chrome.storage.sync
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

/**
 * Listen to settings changes in chrome.storage
 * Returns cleanup function to remove listener
 */
export function onSettingsChanged(
  callback: (settings: UserSettings) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'sync' && changes[SETTINGS_KEY]?.newValue) {
      callback(changes[SETTINGS_KEY].newValue as UserSettings);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => chrome.storage.onChanged.removeListener(listener);
}
