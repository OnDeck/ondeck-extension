import { SYNC_ALARM_NAME } from '../../shared/constants';
import { logger } from '../../shared/logger';
import { syncAll } from '../workers/sync';
import { getStoredAuth } from '../../lib/auth';

const MODULE = 'alarm-scheduler';

/**
 * Schedule periodic sync alarm
 */
export async function setupAlarm(intervalMinutes: number): Promise<void> {
  logger.info({ module: MODULE, message: `Scheduling sync every ${intervalMinutes} minutes` });
  await chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: intervalMinutes,
    delayInMinutes: 0, // run immediately on schedule
  });
}

// Handle alarm triggers
export function registerAlarmHandler(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SYNC_ALARM_NAME) {
      logger.info({ module: MODULE, message: 'github-sync alarm fired' });

      // Get auth state
      const auth = await getStoredAuth();

      if (auth.token && auth.viewer?.login) {
        logger.info({ module: MODULE, message: `Running sync for user: ${auth.viewer.login}` });
        // Incremental notification sync + badge refresh (one inbox fetch).
        await syncAll(auth.token, auth.viewer.login);
      } else {
        logger.info({ module: MODULE, message: 'No auth token found, skipping sync' });
      }
    }
  });
}
