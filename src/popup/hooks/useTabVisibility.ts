import { useState, useEffect, useRef, useCallback } from 'react';
import type { TabId } from '../tabs';
import { logger } from '../../shared/logger';

const SETTINGS_STORAGE_KEY = 'tab_visibility_v1';

export interface TabVisibilitySettings {
  visible: Record<TabId, boolean>;
}

export const DEFAULT_SETTINGS: TabVisibilitySettings = {
  visible: {
    dashboard: true,
    prs: true,
    mentions: true,
    reviews: true,
    notifications: true,
  },
};

async function loadSettings(): Promise<TabVisibilitySettings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const stored = result[SETTINGS_STORAGE_KEY] as Partial<TabVisibilitySettings> | undefined;

  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  // Merge with defaults for forward compatibility
  return {
    visible: {
      ...DEFAULT_SETTINGS.visible,
      ...stored.visible,
    },
  };
}

async function saveSettings(settings: TabVisibilitySettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
}

function validateSettings(settings: TabVisibilitySettings): boolean {
  // At least one tab must be visible
  return Object.values(settings.visible).some((v) => v === true);
}

export function useTabVisibility() {
  const [settings, setSettings] = useState<TabVisibilitySettings | null>(null);
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
        logger.error({ module: 'useTabVisibility', message: 'Failed to load settings', error });
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
  const debouncedSave = useCallback((newSettings: TabVisibilitySettings) => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveSettings(newSettings).catch((error) => {
        logger.error({ module: 'useTabVisibility', message: 'Failed to save settings', error });
      });
      saveTimeoutRef.current = null;
    }, 300);
  }, []);

  const toggleTab = useCallback(
    (tabId: TabId, visible: boolean) => {
      if (!settings) return;

      const newSettings: TabVisibilitySettings = {
        ...settings,
        visible: {
          ...settings.visible,
          [tabId]: visible,
        },
      };

      // Validate: at least one tab must remain visible
      if (!validateSettings(newSettings)) {
        logger.warn({ module: 'useTabVisibility', message: 'Cannot hide last visible tab' });
        return;
      }

      setSettings(newSettings);
      debouncedSave(newSettings);
    },
    [settings, debouncedSave]
  );

  return {
    settings,
    loading,
    toggleTab,
  };
}
