import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS, type NotificationSettings } from '../../../src/popup/hooks/useNotificationSettings';

const SETTINGS_STORAGE_KEY = 'notification_settings_v1';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
const mockGet = vi.fn((keys: string | string[]) => {
  const result: Record<string, unknown> = {};
  const keyArray = typeof keys === 'string' ? [keys] : keys;
  keyArray.forEach((key) => {
    if (key in mockStorage) {
      result[key] = mockStorage[key];
    }
  });
  return Promise.resolve(result);
});

const mockSet = vi.fn((items: Record<string, unknown>) => {
  Object.assign(mockStorage, items);
  return Promise.resolve();
});

global.chrome = {
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
    },
  },
} as unknown as typeof chrome;

describe('notification settings storage', () => {
  beforeEach(() => {
    // Clear mock storage and call history
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    mockGet.mockClear();
    mockSet.mockClear();
  });

  it('exports default settings with all notification types disabled', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      soundEnabled: {
        PullRequest: false,
        Issue: false,
        Release: false,
        Discussion: false,
        Commit: false,
      },
    });
  });

  it('loads settings from chrome storage', async () => {
    const storedSettings: NotificationSettings = {
      soundEnabled: {
        PullRequest: true,
        Issue: false,
        Release: true,
        Discussion: false,
        Commit: false,
      },
    };

    mockStorage[SETTINGS_STORAGE_KEY] = storedSettings;

    const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    const loaded = result[SETTINGS_STORAGE_KEY] as NotificationSettings;

    expect(loaded).toEqual(storedSettings);
  });

  it('saves settings to chrome storage', async () => {
    const settings: NotificationSettings = {
      soundEnabled: {
        PullRequest: true,
        Issue: true,
        Release: false,
        Discussion: true,
        Commit: false,
      },
    };

    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });

    expect(mockStorage[SETTINGS_STORAGE_KEY]).toEqual(settings);
    expect(mockSet).toHaveBeenCalledWith({
      [SETTINGS_STORAGE_KEY]: settings,
    });
  });

  it('handles partial settings by merging with defaults', () => {
    // Simulate older version with fewer notification types
    const partial = {
      soundEnabled: {
        PullRequest: true,
        Issue: true,
      },
    } as Partial<NotificationSettings>;

    const merged: NotificationSettings = {
      soundEnabled: {
        ...DEFAULT_SETTINGS.soundEnabled,
        ...partial.soundEnabled,
      },
    };

    expect(merged).toEqual({
      soundEnabled: {
        PullRequest: true,
        Issue: true,
        Release: false,
        Discussion: false,
        Commit: false,
      },
    });
  });

  it('validates notification type keys', () => {
    const validTypes = ['PullRequest', 'Issue', 'Release', 'Discussion', 'Commit'];
    const settingsKeys = Object.keys(DEFAULT_SETTINGS.soundEnabled);

    expect(settingsKeys).toEqual(validTypes);
  });
});
