import { SYNC_ALARM_NAME } from '../../shared/constants';
import { logger } from '../../shared/logger';
import { syncNotifications } from '../workers/sync';

const MODULE = 'alarm-scheduler';

/**
 * (Re)schedule the periodic sync. Replacing an existing alarm restarts its
 * period, so callers that want data now should also sync directly.
 */
export async function setupAlarm(intervalMinutes: number): Promise<void> {
  logger.info({ module: MODULE, message: `Scheduling sync every ${intervalMinutes} minutes` });
  await chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: intervalMinutes });
}

export function registerAlarmHandler(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== SYNC_ALARM_NAME) return;
    await syncNotifications();
  });
}
