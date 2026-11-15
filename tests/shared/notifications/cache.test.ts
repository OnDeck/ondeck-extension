import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorageArea } from '../../helpers/chromeStorage';
import { readNotificationCache, writeNotificationCache } from '../../../src/shared/notifications/cache';
import { NOTIFICATIONS_CACHE_KEY } from '../../../src/shared/constants';

const local = memoryStorageArea();
global.chrome = { storage: { local } } as unknown as typeof chrome;

describe('notification cache', () => {
  beforeEach(() => local.clear());

  it('round-trips the worker cache', async () => {
    await writeNotificationCache({ items: [], fetchedAt: 123, lastFullSyncAt: 100 });
    expect(await readNotificationCache()).toEqual({ items: [], fetchedAt: 123, lastFullSyncAt: 100 });
  });

  it('ignores missing or malformed data instead of rendering it', async () => {
    expect(await readNotificationCache()).toBeUndefined();
    local.data[NOTIFICATIONS_CACHE_KEY] = { items: 'nope', fetchedAt: 1 };
    expect(await readNotificationCache()).toBeUndefined();
    local.data[NOTIFICATIONS_CACHE_KEY] = { items: [] };
    expect(await readNotificationCache()).toBeUndefined();
  });
});
