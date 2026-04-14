// Multi-account storage layer.
//
// Tokens for every signed-in account are stored encrypted in
// chrome.storage.sync under a single `gh_workflow_accounts_v1` envelope-bag
// keyed by accountId. The active accountId + the viewer profile blobs live
// in chrome.storage.local so popup loads don't have to wait on sync before
// rendering the header.

import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import type { Viewer } from './github-api';

export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v1';
export const VIEWERS_STORAGE_KEY = 'gh_workflow_viewers_v1';
export const ACTIVE_ACCOUNT_KEY = 'gh_workflow_active_account_v1';

// Legacy single-account keys — migrated on first read.
export const LEGACY_TOKEN_KEY = 'gh_workflow_token_v1';
export const LEGACY_VIEWER_KEY = 'gh_workflow_viewer_v1';

export interface StoredAccount {
  envelope: Envelope;
}

export type AccountsMap = Record<string, StoredAccount>;
export type ViewersMap = Record<string, Viewer>;

export interface AccountSummary {
  id: string;
  viewer: Viewer;
  active: boolean;
}

function accountIdFor(viewer: Viewer): string {
  return `${viewer.id}-${viewer.login}`;
}

async function loadAccountsMap(): Promise<AccountsMap> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as AccountsMap | undefined) ?? {};
}

async function loadViewersMap(): Promise<ViewersMap> {
  const bag = await chrome.storage.local.get(VIEWERS_STORAGE_KEY);
  return (bag[VIEWERS_STORAGE_KEY] as ViewersMap | undefined) ?? {};
}

async function saveAccountsMap(map: AccountsMap): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_STORAGE_KEY]: map });
}

async function saveViewersMap(map: ViewersMap): Promise<void> {
  await chrome.storage.local.set({ [VIEWERS_STORAGE_KEY]: map });
}

async function loadActiveId(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_KEY);
  return (bag[ACTIVE_ACCOUNT_KEY] as string | undefined) ?? null;
}

async function saveActiveId(id: string | null): Promise<void> {
  if (id == null) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_ACCOUNT_KEY]: id });
  }
}

/**
 * Migrate the single-account storage layout (ticket #2) into the
 * multi-account layout. Idempotent — running it a second time is a no-op.
 */
async function migrateLegacyIfNeeded(): Promise<void> {
  const accounts = await loadAccountsMap();
  if (Object.keys(accounts).length > 0) return;

  const [syncBag, localBag] = await Promise.all([
    chrome.storage.sync.get(LEGACY_TOKEN_KEY),
    chrome.storage.local.get(LEGACY_VIEWER_KEY),
  ]);
  const legacyToken = syncBag[LEGACY_TOKEN_KEY] as StoredAccount | undefined;
  const legacyViewer = localBag[LEGACY_VIEWER_KEY] as Viewer | undefined;
  if (!legacyToken?.envelope || !legacyViewer) return;

  const id = accountIdFor(legacyViewer);
  const viewers = await loadViewersMap();
  await Promise.all([
    saveAccountsMap({ [id]: { envelope: legacyToken.envelope } }),
    saveViewersMap({ ...viewers, [id]: legacyViewer }),
    saveActiveId(id),
    chrome.storage.sync.remove(LEGACY_TOKEN_KEY),
    chrome.storage.local.remove(LEGACY_VIEWER_KEY),
  ]);
}

export interface ActiveAuthState {
  token: string | null;
  viewer: Viewer | null;
  accountId: string | null;
}

export async function getActiveAuth(): Promise<ActiveAuthState> {
  await migrateLegacyIfNeeded();
  const [accounts, viewers, activeId] = await Promise.all([
    loadAccountsMap(),
    loadViewersMap(),
    loadActiveId(),
  ]);
  if (!activeId || !accounts[activeId] || !viewers[activeId]) {
    return { token: null, viewer: null, accountId: null };
  }
  try {
    const token = await decryptString(accounts[activeId].envelope);
    return { token, viewer: viewers[activeId], accountId: activeId };
  } catch {
    // Crypto key was rotated or wiped — drop this account.
    await removeAccount(activeId);
    return { token: null, viewer: null, accountId: null };
  }
}

export async function listAccounts(): Promise<AccountSummary[]> {
  await migrateLegacyIfNeeded();
  const [accounts, viewers, activeId] = await Promise.all([
    loadAccountsMap(),
    loadViewersMap(),
    loadActiveId(),
  ]);
  return Object.keys(accounts)
    .filter((id) => Boolean(viewers[id]))
    .map((id) => ({ id, viewer: viewers[id], active: id === activeId }));
}

export async function addAccount(token: string, viewer: Viewer): Promise<string> {
  const id = accountIdFor(viewer);
  const envelope = await encryptString(token);
  const [accounts, viewers] = await Promise.all([loadAccountsMap(), loadViewersMap()]);
  await Promise.all([
    saveAccountsMap({ ...accounts, [id]: { envelope } }),
    saveViewersMap({ ...viewers, [id]: viewer }),
    saveActiveId(id),
  ]);
  return id;
}

export async function setActiveAccount(id: string): Promise<void> {
  const accounts = await loadAccountsMap();
  if (!accounts[id]) return;
  await saveActiveId(id);
}

export async function removeAccount(id: string): Promise<string | null> {
  const [accounts, viewers, activeId] = await Promise.all([
    loadAccountsMap(),
    loadViewersMap(),
    loadActiveId(),
  ]);
  const nextAccounts = { ...accounts };
  delete nextAccounts[id];
  const nextViewers = { ...viewers };
  delete nextViewers[id];
  const remainingIds = Object.keys(nextAccounts);
  const nextActive = activeId === id ? remainingIds[0] ?? null : activeId;
  await Promise.all([
    saveAccountsMap(nextAccounts),
    saveViewersMap(nextViewers),
    saveActiveId(nextActive),
  ]);
  // If the user signed out of every account, reset the crypto key too so
  // the next sign-in re-initialises a clean envelope.
  if (remainingIds.length === 0) {
    await clearCryptoKey();
  }
  return nextActive;
}
