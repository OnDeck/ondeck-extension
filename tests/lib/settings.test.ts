import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getSettings } from '../../src/lib/settings';
import { DEFAULT_SETTINGS } from '../../src/shared/settings/defaults';

const mockStorage: Record<string, unknown> = {};
const mockGet = vi.fn((key: string) =>
  Promise.resolve(key in mockStorage ? { [key]: mockStorage[key] } : {}),
);

global.chrome = {
  storage: { sync: { get: mockGet } },
} as unknown as typeof chrome;

describe('getSettings migration', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    mockGet.mockClear();
  });

  it('returns defaults when nothing is stored', async () => {
    const result = await getSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('fills in the notifications block when an older settings object lacks it', async () => {
    // Simulate settings saved before the desktop-notifications field existed.
    mockStorage.settings = {
      sync: { enabled: true, intervalMinutes: 30 },
      badge: { formula: 'all' },
      display: { showTabCounts: true, tabsToShow: ['prs'] },
      filters: {
        includeDraftPrs: false,
        hideClosed: true,
        hiddenRepos: [],
        priorityLabels: [],
      },
    };

    const result = await getSettings();

    expect(result.notifications).toEqual(DEFAULT_SETTINGS.notifications);
    // Existing values are preserved through the merge.
    expect(result.sync.intervalMinutes).toBe(30);
    expect(result.filters.hideClosed).toBe(true);
  });

  it('preserves a stored notifications block over defaults', async () => {
    mockStorage.settings = {
      ...DEFAULT_SETTINGS,
      notifications: { enabled: false, sound: true, reasons: ['assign'] },
    };

    const result = await getSettings();

    expect(result.notifications).toEqual({
      enabled: false,
      sound: true,
      reasons: ['assign'],
    });
  });
});
