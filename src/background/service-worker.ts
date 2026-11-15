import { setupAlarm, registerAlarmHandler } from './schedulers/alarm';
import { syncNotifications } from './workers/sync';
import { registerNotificationClickHandler } from './workers/desktop-notifications';
import { getSettings } from '../lib/settings';
import { TOKEN_STORAGE_KEY } from '../lib/auth';
import { logger } from '../shared/logger';
import { SYNC_ALARM_NAME } from '../shared/constants';
import type { UserSettings } from '../shared/settings/types';

async function scheduleAndSync(): Promise<void> {
  const settings = await getSettings();
  if (!settings.sync.enabled) return;
  await setupAlarm(settings.sync.intervalMinutes);
  await syncNotifications();
}

chrome.runtime.onInstalled.addListener(() => {
  logger.info({ module: 'service-worker', message: 'Extension installed/updated' });
  void scheduleAndSync();
});

chrome.runtime.onStartup.addListener(() => {
  void scheduleAndSync();
});

registerAlarmHandler();
registerNotificationClickHandler();

function syncSettingsChanged(prev?: UserSettings, next?: UserSettings): boolean {
  return (
    prev?.sync?.enabled !== next?.sync?.enabled ||
    prev?.sync?.intervalMinutes !== next?.sync?.intervalMinutes
  );
}

chrome.storage.onChanged.addListener((changes, area) => {
  // Sign-in and sign-out: refresh (or clear) the badge straight away instead of
  // waiting up to a full interval for the next alarm.
  if (area === 'local' && changes[TOKEN_STORAGE_KEY]) {
    void syncNotifications();
    return;
  }

  if (area !== 'sync' || !changes.settings?.newValue) return;
  const next = changes.settings.newValue as UserSettings;
  const prev = changes.settings.oldValue as UserSettings | undefined;
  // Toggling sounds or notification reasons shouldn't cost API calls.
  if (!syncSettingsChanged(prev, next)) return;

  void (async () => {
    try {
      if (next.sync.enabled) {
        await setupAlarm(next.sync.intervalMinutes);
        await syncNotifications();
      } else {
        await chrome.alarms.clear(SYNC_ALARM_NAME);
        await chrome.action.setBadgeText({ text: '' });
      }
    } catch (error) {
      logger.error({ module: 'service-worker', message: 'Error handling settings change', error });
    }
  })();
});

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
