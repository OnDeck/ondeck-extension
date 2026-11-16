import { setupAlarm, registerAlarmHandler } from './schedulers/alarm';
import { syncNotifications } from './workers/sync';
import { registerNotificationClickHandler } from './workers/desktop-notifications';
import { removeLegacyStorage } from './workers/legacy-storage';
import { cancelDeviceFlow, registerDeviceFlowAlarm, resumeDeviceFlow, startDeviceFlow } from './workers/deviceFlow';
import { getSettings } from '../lib/settings';
import { TOKEN_STORAGE_KEY } from '../lib/auth';
import { logger } from '../shared/logger';
import { SYNC_ALARM_NAME } from '../shared/constants';
import type { UserSettings } from '../shared/settings/types';

async function scheduleAndSync(): Promise<void> {
  const settings = await getSettings();
  if (!settings.sync.enabled) return;
  await setupAlarm(settings.sync.intervalMinutes);
  await syncNotifications({ full: true });
}

chrome.runtime.onInstalled.addListener((details) => {
  logger.info({ module: 'service-worker', message: 'Extension installed/updated' });
  if (details.reason === 'update') {
    removeLegacyStorage().catch((error) => {
      logger.error({ module: 'service-worker', message: 'Legacy storage cleanup failed', error });
    });
  }
  void scheduleAndSync();
});

chrome.runtime.onStartup.addListener(() => {
  void scheduleAndSync();
});

registerAlarmHandler();
registerNotificationClickHandler();
registerDeviceFlowAlarm();
// Chrome may have stopped the worker while a sign-in code was waiting.
void resumeDeviceFlow();

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
    void syncNotifications({ full: true });
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
        await syncNotifications({ full: true });
      } else {
        await chrome.alarms.clear(SYNC_ALARM_NAME);
        await chrome.action.setBadgeText({ text: '' });
      }
    } catch (error) {
      logger.error({ module: 'service-worker', message: 'Error handling settings change', error });
    }
  })();
});

function messageType(message: unknown): unknown {
  return typeof message === 'object' && message !== null ? (message as Record<string, unknown>).type : undefined;
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  switch (messageType(message)) {
    // After marking threads read: reconcile in full so they drop out of the
    // cache and the badge.
    case 'REQUEST_SYNC':
      void syncNotifications({ full: true });
      break;
    case 'START_DEVICE_FLOW':
      void startDeviceFlow();
      break;
    case 'CANCEL_DEVICE_FLOW':
      void cancelDeviceFlow();
      break;
  }
});

export {};
