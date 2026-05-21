/* eslint-disable no-console */
import { useState, useEffect, useRef, useCallback } from 'react';

const SETTINGS_STORAGE_KEY = 'notification_settings_v1';

export interface NotificationSettings {
  soundEnabled: {
    PullRequest: boolean;
    Issue: boolean;
    Release: boolean;
    Discussion: boolean;
    Commit: boolean;
  };
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: {
    PullRequest: false,
    Issue: false,
    Release: false,
    Discussion: false,
    Commit: false,
  },
};

async function loadSettings(): Promise<NotificationSettings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const stored = result[SETTINGS_STORAGE_KEY] as Partial<NotificationSettings> | undefined;

  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  // Merge with defaults for forward compatibility
  return {
    soundEnabled: {
      ...DEFAULT_SETTINGS.soundEnabled,
      ...stored.soundEnabled,
    },
  };
}

async function saveSettings(settings: NotificationSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load settings:', error);
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      });
  }, []);

  // Cleanup pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced save function
  const debouncedSave = useCallback((newSettings: NotificationSettings) => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveSettings(newSettings).catch((error) => {
        console.error('Failed to save settings:', error);
      });
      saveTimeoutRef.current = null;
    }, 300);
  }, []);

  const updateSound = useCallback(
    (type: keyof NotificationSettings['soundEnabled'], enabled: boolean) => {
      if (!settings) return;

      const newSettings: NotificationSettings = {
        ...settings,
        soundEnabled: {
          ...settings.soundEnabled,
          [type]: enabled,
        },
      };

      setSettings(newSettings);
      debouncedSave(newSettings);
    },
    [settings, debouncedSave]
  );

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    debouncedSave(DEFAULT_SETTINGS);
  }, [debouncedSave]);

  return {
    settings,
    loading,
    updateSound,
    resetToDefaults,
  };
}
