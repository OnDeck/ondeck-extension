// Multi-account storage. An "account" is a (GitHub login, encrypted
// token) pair that lives alongside the existing v1 single-account
// storage so upgrades are non-destructive.
//
// Layout:
//   chrome.storage.sync
//     gh_workflow_accounts_v2        : { [id]: { id, envelope, login } }
//     gh_workflow_active_account_v2  : id
//   chrome.storage.local
//     gh_workflow_viewers_v2         : { [id]: Viewer }
//
// The id is stable across token refreshes (login + numeric GitHub id).

import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

export const ACCOUNTS_KEY = 'gh_workflow_accounts_v2';
export const ACTIVE_ACCOUNT_KEY = 'gh_workflow_active_account_v2';
export const VIEWERS_KEY = 'gh_workflow_viewers_v2';

// v1 keys — we read these on migration so existing users don't lose
// their session when upgrading to multi-account.
const V1_TOKEN_KEY = 'gh_workflow_token_v1';
const V1_VIEWER_KEY = 'gh_workflow_viewer_v1';

export interface StoredAccountRecord {
  id: string;
  envelope: Envelope;
  login: string;
}

export interface AccountSummary {
  id: string;
  login: string;
  viewer: Viewer | null;
}

export interface ActiveAccount {
  id: string;
  token: string;
  viewer: Viewer;
}

function accountId(viewer: Pick<Viewer, 'id' | 'login'>): string {
  return `gh:${viewer.id}:${viewer.login}`;
}

async function readAccountsBag(): Promise<Record<string, StoredAccountRecord>> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_KEY);
  return (bag[ACCOUNTS_KEY] as Record<string, StoredAccountRecord> | undefined) ?? {};
}

async function readViewersBag(): Promise<Record<string, Viewer>> {
  const bag = await chrome.storage.local.get(VIEWERS_KEY);
  return (bag[VIEWERS_KEY] as Record<string, Viewer> | undefined) ?? {};
}

async function writeAccountsBag(next: Record<string, StoredAccountRecord>): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_KEY]: next });
}

async function writeViewersBag(next: Record<string, Viewer>): Promise<void> {
  await chrome.storage.local.set({ [VIEWERS_KEY]: next });
}

/**
 * If a v1 single-account payload is still present, migrate it into
 * the v2 multi-account store and then delete the v1 keys so we don't
 * run migration again on every load.
 */
export async function migrateV1IfNeeded(): Promise<void> {
  const [syncBag, localBag, accountsBag] = await Promise.all([
    chrome.storage.sync.get(V1_TOKEN_KEY),
    chrome.storage.local.get(V1_VIEWER_KEY),
    readAccountsBag(),
  ]);
  const legacy = syncBag[V1_TOKEN_KEY] as { envelope: Envelope } | undefined;
  const legacyViewer = localBag[V1_VIEWER_KEY] as Viewer | undefined;
  if (!legacy?.envelope || !legacyViewer) return;
  const id = accountId(legacyViewer);
  if (accountsBag[id]) {
    // v1 already migrated into v2 on a previous run — just clean up.
    await Promise.all([
      chrome.storage.sync.remove(V1_TOKEN_KEY),
      chrome.storage.local.remove(V1_VIEWER_KEY),
    ]);
    return;
  }
  const accounts: Record<string, StoredAccountRecord> = {
    ...accountsBag,
    [id]: { id, envelope: legacy.envelope, login: legacyViewer.login },
  };
  const viewers = { ...(await readViewersBag()), [id]: legacyViewer };
  await Promise.all([
    writeAccountsBag(accounts),
    writeViewersBag(viewers),
    chrome.storage.sync.set({ [ACTIVE_ACCOUNT_KEY]: id }),
    chrome.storage.sync.remove(V1_TOKEN_KEY),
    chrome.storage.local.remove(V1_VIEWER_KEY),
  ]);
}

export async function listAccounts(): Promise<AccountSummary[]> {
  await migrateV1IfNeeded();
  const [accounts, viewers] = await Promise.all([readAccountsBag(), readViewersBag()]);
  return Object.values(accounts).map((record) => ({
    id: record.id,
    login: record.login,
    viewer: viewers[record.id] ?? null,
  }));
}

export async function getActiveAccountId(): Promise<string | null> {
  const bag = await chrome.storage.sync.get(ACTIVE_ACCOUNT_KEY);
  const id = bag[ACTIVE_ACCOUNT_KEY];
  return typeof id === 'string' ? id : null;
}

export async function setActiveAccount(id: string): Promise<void> {
  await chrome.storage.sync.set({ [ACTIVE_ACCOUNT_KEY]: id });
}

/**
 * Returns the currently active account, decrypted. Returns null if no
 * account is selected or if decryption fails (key rotation, etc.).
 */
export async function getActiveAccount(): Promise<ActiveAccount | null> {
  await migrateV1IfNeeded();
  const [accounts, viewers, activeId] = await Promise.all([
    readAccountsBag(),
    readViewersBag(),
    getActiveAccountId(),
  ]);
  const ids = Object.keys(accounts);
  if (ids.length === 0) return null;
  const chosen = activeId && accounts[activeId] ? activeId : ids[0];
  const record = accounts[chosen];
  const viewer = viewers[chosen];
  if (!record || !viewer) return null;
  try {
    const token = await decryptString(record.envelope);
    return { id: chosen, token, viewer };
  } catch {
    await removeAccount(chosen);
    return null;
  }
}

/**
 * Add a new account by verifying the token with GitHub and persisting
 * it to the multi-account store. Makes the newly-added account active.
 */
export async function addAccountWithToken(token: string): Promise<ActiveAccount> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new GitHubApiError('Token is required', 0, 'other');
  }
  const viewer = await fetchViewer(trimmed);
  const id = accountId(viewer);
  const [accounts, viewers] = await Promise.all([readAccountsBag(), readViewersBag()]);
  const envelope = await encryptString(trimmed);
  const nextAccounts = {
    ...accounts,
    [id]: { id, envelope, login: viewer.login } satisfies StoredAccountRecord,
  };
  const nextViewers = { ...viewers, [id]: viewer };
  await Promise.all([
    writeAccountsBag(nextAccounts),
    writeViewersBag(nextViewers),
    setActiveAccount(id),
  ]);
  return { id, token: trimmed, viewer };
}

/**
 * Remove an account. If it was the active one, pick any remaining
 * account as the new active; if no accounts remain, clear the crypto
 * key so nothing decryptable is left on disk.
 */
export async function removeAccount(id: string): Promise<void> {
  const [accounts, viewers, activeId] = await Promise.all([
    readAccountsBag(),
    readViewersBag(),
    getActiveAccountId(),
  ]);
  const nextAccounts = { ...accounts };
  delete nextAccounts[id];
  const nextViewers = { ...viewers };
  delete nextViewers[id];
  const remainingIds = Object.keys(nextAccounts);
  const nextActive = activeId === id ? (remainingIds[0] ?? null) : activeId;
  const writes: Promise<unknown>[] = [
    writeAccountsBag(nextAccounts),
    writeViewersBag(nextViewers),
  ];
  if (nextActive) {
    writes.push(setActiveAccount(nextActive));
  } else {
    writes.push(chrome.storage.sync.remove(ACTIVE_ACCOUNT_KEY));
  }
  await Promise.all(writes);
  if (remainingIds.length === 0) {
    await clearCryptoKey();
  }
}
