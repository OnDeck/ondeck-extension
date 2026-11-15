import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorageArea } from '../helpers/chromeStorage';
import {
  getStoredAuth,
  saveToken,
  signOut,
  TOKEN_STORAGE_KEY,
  VIEWER_STORAGE_KEY,
} from '../../src/lib/auth';
import { encryptString } from '../../src/lib/crypto';
import { NOTIFICATIONS_CACHE_KEY } from '../../src/shared/constants';

const local = memoryStorageArea();
const sync = memoryStorageArea();
global.chrome = { storage: { local, sync } } as unknown as typeof chrome;

const viewer = { login: 'me', id: 1, name: null, avatar_url: '', html_url: '' };

describe('token storage', () => {
  beforeEach(() => {
    local.clear();
    sync.clear();
  });

  it('keeps the token out of chrome.storage.sync', async () => {
    await saveToken('ghp_secret', viewer);
    expect(sync.data[TOKEN_STORAGE_KEY]).toBeUndefined();
    expect(await getStoredAuth()).toEqual({ token: 'ghp_secret', viewer });
  });

  it('migrates a legacy sync token this device can decrypt', async () => {
    sync.data[TOKEN_STORAGE_KEY] = { envelope: await encryptString('ghp_legacy') };
    local.data[VIEWER_STORAGE_KEY] = viewer;

    expect(await getStoredAuth()).toEqual({ token: 'ghp_legacy', viewer });
    expect(sync.data[TOKEN_STORAGE_KEY]).toBeUndefined();
    expect(local.data[TOKEN_STORAGE_KEY]).toBeDefined();
  });

  it('leaves a legacy token from another device alone instead of wiping it', async () => {
    const foreign = { envelope: { iv: 'AAAAAAAAAAAAAAAA', ciphertext: 'AAAA' } };
    sync.data[TOKEN_STORAGE_KEY] = foreign;
    local.data[VIEWER_STORAGE_KEY] = viewer;

    expect(await getStoredAuth()).toEqual({ token: null, viewer: null });
    expect(sync.data[TOKEN_STORAGE_KEY]).toEqual(foreign);
  });

  it('sign-out clears local and legacy copies', async () => {
    await saveToken('ghp_secret', viewer);
    local.data[NOTIFICATIONS_CACHE_KEY] = { items: [], fetchedAt: 1 };
    sync.data[TOKEN_STORAGE_KEY] = { envelope: await encryptString('old') };
    await signOut();
    expect(local.data[TOKEN_STORAGE_KEY]).toBeUndefined();
    expect(sync.data[TOKEN_STORAGE_KEY]).toBeUndefined();
    expect(local.data[NOTIFICATIONS_CACHE_KEY]).toBeUndefined();
    expect(await getStoredAuth()).toEqual({ token: null, viewer: null });
  });
});
