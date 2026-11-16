import { pruneLegacySettings } from '../../lib/settings';

// Keys written by features that have since been removed: per-type popup
// sounds, tab visibility, the search-API badge counts and the v1 seen cache.
const LEGACY_LOCAL_KEYS = [
  'notification_settings_v1',
  'tab_visibility_v1',
  'counts',
  'last_notification_ids_v1',
];

export async function removeLegacyStorage(): Promise<void> {
  await chrome.storage.local.remove(LEGACY_LOCAL_KEYS);
  await pruneLegacySettings();
}
