import { setupAlarm, registerAlarmHandler } from './schedulers/alarm';
import { syncNotifications, syncAndUpdateBadge } from './workers/sync';
import { getSettings } from '../lib/settings';
import { getStoredAuth } from '../lib/auth';

// On extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[install] Extension installed/updated');

  const settings = await getSettings();

  if (settings.sync.enabled) {
    await setupAlarm(settings.sync.intervalMinutes);

    // Run initial sync immediately if token exists
    const auth = await getStoredAuth();
    if (auth.token && auth.viewer?.login) {
      await syncAndUpdateBadge(auth.token, auth.viewer.login);
    }
  }

  console.log('[install] Setup complete');
});

// Re-sync on browser startup (service worker restarts).
chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();

  if (settings.sync.enabled) {
    await setupAlarm(settings.sync.intervalMinutes);
    void syncNotifications();
  }
});

registerAlarmHandler();

// When settings change, reschedule alarm or clear badge
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.settings?.newValue) {
    const settings = changes.settings.newValue;
    console.log('[settings] Settings changed:', settings);

    if (settings.sync?.enabled) {
      await setupAlarm(settings.sync.intervalMinutes);

      // Trigger immediate sync if we have auth
      const auth = await getStoredAuth();
      if (auth.token && auth.viewer?.login) {
        await syncAndUpdateBadge(auth.token, auth.viewer.login);
      }
    } else {
      console.log('[settings] Sync disabled, clearing alarm and badge');
      await chrome.alarms.clear('github-sync');
      await chrome.action.setBadgeText({ text: '' });
    }
  }
});

// Popup requests a fresh sync so it always opens with current data.
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    typeof message === 'object' &&
    message !== null &&
    (message as Record<string, unknown>)['type'] === 'REQUEST_SYNC'
  ) {
    void syncNotifications();
  }
});

export {};
