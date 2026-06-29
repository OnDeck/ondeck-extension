import { useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings } from '../../lib/settings';
import type { UserSettings, NotificationReasonFilter } from '../../shared/settings/types';
import { logger } from '../../shared/logger';

export function useDesktopNotificationSettings() {
  const [settings, setSettings] = useState<UserSettings['notifications'] | null>(null);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    getSettings()
      .then((loaded) => {
        setSettings(loaded.notifications);
        setLoading(false);
      })
      .catch((error) => {
        logger.error({ module: 'useDesktopNotificationSettings', message: 'Failed to load settings', error });
        setLoading(false);
      });
  }, []);

  const updateEnabled = useCallback(async (enabled: boolean) => {
    try {
      const current = await getSettings();
      const updated: UserSettings = {
        ...current,
        notifications: {
          ...current.notifications,
          enabled,
        },
      };
      await saveSettings(updated);
      setSettings(updated.notifications);
    } catch (error) {
      logger.error({ module: 'useDesktopNotificationSettings', message: 'Failed to update enabled', error });
    }
  }, []);

  const updateSound = useCallback(async (sound: boolean) => {
    try {
      const current = await getSettings();
      const updated: UserSettings = {
        ...current,
        notifications: {
          ...current.notifications,
          sound,
        },
      };
      await saveSettings(updated);
      setSettings(updated.notifications);
    } catch (error) {
      logger.error({ module: 'useDesktopNotificationSettings', message: 'Failed to update sound', error });
    }
  }, []);

  const toggleReason = useCallback(async (reason: NotificationReasonFilter, enabled: boolean) => {
    try {
      const current = await getSettings();
      const reasons = enabled
        ? [...current.notifications.reasons, reason]
        : current.notifications.reasons.filter((r) => r !== reason);

      const updated: UserSettings = {
        ...current,
        notifications: {
          ...current.notifications,
          reasons,
        },
      };
      await saveSettings(updated);
      setSettings(updated.notifications);
    } catch (error) {
      logger.error({ module: 'useDesktopNotificationSettings', message: 'Failed to toggle reason', error });
    }
  }, []);

  return {
    settings,
    loading,
    updateEnabled,
    updateSound,
    toggleReason,
  };
}
