import { SYNC_ALARM_NAME, SYNC_INTERVAL_MINUTES } from '../../shared/constants';
import { logger } from '../../shared/logger';
import { syncNotifications } from '../workers/sync';

const MODULE = 'alarm-scheduler';

export function setupAlarm(): void {
  chrome.alarms.create(SYNC_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  });
  logger.info({ module: MODULE, message: `Alarm registered (every ${SYNC_INTERVAL_MINUTES}m)` });
}

export function registerAlarmHandler(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM_NAME) {
      void syncNotifications();
    }
  });
}
