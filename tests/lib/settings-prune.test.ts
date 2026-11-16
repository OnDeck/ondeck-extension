import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorageArea } from '../helpers/chromeStorage';
import { getSettings, pruneLegacySettings } from '../../src/lib/settings';
import { DEFAULT_SETTINGS } from '../../src/shared/settings/defaults';

const sync = memoryStorageArea();
global.chrome = { storage: { sync } } as unknown as typeof chrome;

describe('settings cleanup', () => {
  beforeEach(() => sync.clear());

  it('drops blocks from removed features and keeps the rest', async () => {
    sync.data.settings = {
      sync: { enabled: true, intervalMinutes: 30 },
      badge: { formula: 'all' },
      display: { showTabCounts: true, tabsToShow: [] },
      filters: { hideClosed: true },
      notifications: { enabled: false, sound: true, reasons: ['assign'] },
    };
    await pruneLegacySettings();
    expect(sync.data.settings).toEqual({
      sync: { enabled: true, intervalMinutes: 30 },
      notifications: { enabled: false, sound: true, reasons: ['assign'] },
    });
  });

  it('leaves clean settings untouched', async () => {
    await pruneLegacySettings();
    expect(sync.data.settings).toBeUndefined();
  });

  it('never hands out the shared defaults object', async () => {
    const settings = await getSettings();
    settings.sync.intervalMinutes = 60;
    expect(DEFAULT_SETTINGS.sync.intervalMinutes).toBe(15);
  });
});
