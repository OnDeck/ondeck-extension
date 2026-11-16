import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../../lib/settings';
import type { SyncInterval } from '../../shared/settings/types';
import { logger } from '../../shared/logger';

export function useSyncSettings() {
  const [syncInterval, setSyncInterval] = useState<SyncInterval>(15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then((settings) => setSyncInterval(settings.sync.intervalMinutes))
      .catch((error) => {
        logger.error({ module: 'useSyncSettings', message: 'Failed to load settings', error });
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSyncInterval = async (interval: SyncInterval) => {
    const previous = syncInterval;
    setSyncInterval(interval);
    try {
      const settings = await getSettings();
      await saveSettings({ ...settings, sync: { ...settings.sync, intervalMinutes: interval } });
    } catch (error) {
      logger.error({ module: 'useSyncSettings', message: 'Failed to update sync interval', error });
      setSyncInterval(previous);
    }
  };

  return { syncInterval, loading, updateSyncInterval };
}
