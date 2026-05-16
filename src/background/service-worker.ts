import { setupAlarm, registerAlarmHandler } from './schedulers/alarm';
import { syncNotifications, syncAndUpdateBadge } from './workers/sync';
import { getSettings } from '../lib/settings';
import { getStoredAuth } from '../lib/auth';
import { logger } from '../shared/logger';
import { SYNC_ALARM_NAME } from '../shared/constants';

// On extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  logger.info({ module: 'service-worker', message: 'Extension installed/updated' });

  const settings = await getSettings();

  if (settings.sync.enabled) {
    await setupAlarm(settings.sync.intervalMinutes);

    // Run initial sync immediately if token exists
    const auth = await getStoredAuth();
    if (auth.token && auth.viewer?.login) {
      await syncAndUpdateBadge(auth.token, auth.viewer.login);
    }
  }

  logger.info({ module: 'service-worker', message: 'Setup complete' });
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
  try {
    if (area === 'sync' && changes.settings?.newValue) {
      const settings = changes.settings.newValue;
      logger.info({ module: 'service-worker', message: 'Settings changed', data: settings });

      if (settings.sync?.enabled) {
        await setupAlarm(settings.sync.intervalMinutes);

        // Trigger immediate sync if we have auth
        const auth = await getStoredAuth();
        if (auth.token && auth.viewer?.login) {
          await syncAndUpdateBadge(auth.token, auth.viewer.login);
        }
      } else {
        logger.info({ module: 'service-worker', message: 'Sync disabled, clearing alarm and badge' });
        await chrome.alarms.clear(SYNC_ALARM_NAME);
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    logger.error({ module: 'service-worker', message: 'Error handling storage change', error });
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
