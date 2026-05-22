import { useState, useEffect } from 'react';
import { getSettings } from '../../lib/settings';
import type { SyncInterval } from '../../shared/settings/types';

const SETTINGS_KEY = 'userSettings';

export function useFilterSettings() {
  const [hideClosed, setHideClosed] = useState(false);
  const [syncInterval, setSyncInterval] = useState<SyncInterval>(15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setHideClosed(settings.filters.hideClosed);
        setSyncInterval(settings.sync.intervalMinutes);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const toggleHideClosed = async (value: boolean) => {
    setHideClosed(value);

    try {
      const settings = await getSettings();
      settings.filters.hideClosed = value;
      await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    } catch (error) {
      console.error('Failed to update hideClosed setting:', error);
      // Revert on error
      setHideClosed(!value);
    }
  };

  const updateSyncInterval = async (interval: SyncInterval) => {
    setSyncInterval(interval);

    try {
      const settings = await getSettings();
      settings.sync.intervalMinutes = interval;
      await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    } catch (error) {
      console.error('Failed to update sync interval:', error);
      // Revert on error
      const settings = await getSettings();
      setSyncInterval(settings.sync.intervalMinutes);
    }
  };

  return {
    hideClosed,
    syncInterval,
    loading,
    toggleHideClosed,
    updateSyncInterval,
  };
}
