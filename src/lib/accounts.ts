// Multi-account layer sitting on top of the v1 single-account auth storage.
// The active account's token is always mirrored into the v1 slot so the rest
// of the app (github-api, service worker, hooks) keeps working unchanged.

import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, type Viewer } from './github-api';
import { TOKEN_STORAGE_KEY, VIEWER_STORAGE_KEY } from './auth';

export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v2';
export const ACTIVE_ACCOUNT_STORAGE_KEY = 'gh_workflow_active_account_v2';

export interface Account {
  id: string; // stable per-login id
  viewer: Viewer;
  envelope: Envelope;
  addedAt: number;
}

interface AccountsBag {
  accounts: Account[];
}

async function readBag(): Promise<AccountsBag> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_STORAGE_KEY);
  const stored = bag[ACCOUNTS_STORAGE_KEY] as AccountsBag | undefined;
  return stored ?? { accounts: [] };
}

async function writeBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_STORAGE_KEY]: bag });
}

async function setActive(id: string | null): Promise<void> {
  if (id == null) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_STORAGE_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_ACCOUNT_STORAGE_KEY]: id });
  }
}

export async function getActiveAccountId(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_STORAGE_KEY);
  return (bag[ACTIVE_ACCOUNT_STORAGE_KEY] as string | undefined) ?? null;
}

export async function listAccounts(): Promise<Account[]> {
  const bag = await readBag();
  return bag.accounts;
}

async function mirrorToV1(account: Account): Promise<void> {
  // The v1 slot is what the rest of the app reads. Re-encrypt under the
  // active crypto key so `decryptString` works from anywhere.
  const token = await decryptString(account.envelope);
  const envelope = await encryptString(token);
  await Promise.all([
    chrome.storage.sync.set({ [TOKEN_STORAGE_KEY]: { envelope } }),
    chrome.storage.local.set({ [VIEWER_STORAGE_KEY]: account.viewer }),
  ]);
}

async function clearV1(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.remove(TOKEN_STORAGE_KEY),
    chrome.storage.local.remove(VIEWER_STORAGE_KEY),
  ]);
}

/**
 * Add an account by verifying a PAT/OAuth token and persisting its
 * encrypted envelope under the multi-account slot. The added account becomes
 * the active one.
 */
export async function addAccountFromToken(token: string): Promise<Account> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('Token is required');
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const account: Account = {
    id: String(viewer.id),
    viewer,
    envelope,
    addedAt: Date.now(),
  };
  const bag = await readBag();
  const existingIdx = bag.accounts.findIndex((a) => a.id === account.id);
  if (existingIdx >= 0) {
    bag.accounts[existingIdx] = account;
  } else {
    bag.accounts.push(account);
  }
  await writeBag(bag);
  await setActive(account.id);
  await mirrorToV1(account);
  return account;
}

export async function switchActiveAccount(id: string): Promise<Account | null> {
  const bag = await readBag();
  const account = bag.accounts.find((a) => a.id === id);
  if (!account) return null;
  await setActive(account.id);
  await mirrorToV1(account);
  return account;
}

export async function removeAccount(id: string): Promise<Account | null> {
  const bag = await readBag();
  const next = bag.accounts.filter((a) => a.id !== id);
  await writeBag({ accounts: next });
  const activeId = await getActiveAccountId();
  if (activeId === id) {
    if (next.length === 0) {
      await setActive(null);
      await clearV1();
      await clearCryptoKey();
      return null;
    }
    const fallback = next[0];
    await setActive(fallback.id);
    await mirrorToV1(fallback);
    return fallback;
  }
  return null;
}

/**
 * Promote the legacy v1 single-account storage into the v2 accounts bag
 * the first time the multi-account UI is opened. Preserves isolation: the
 * v1 envelope is decrypted, wrapped into an Account record, and kept in v1
 * as the mirrored active account.
 */
export async function syncActiveAccountFromLegacy(): Promise<void> {
  const bag = await readBag();
  if (bag.accounts.length > 0) return;
  const [syncBag, localBag] = await Promise.all([
    chrome.storage.sync.get(TOKEN_STORAGE_KEY),
    chrome.storage.local.get(VIEWER_STORAGE_KEY),
  ]);
  const stored = syncBag[TOKEN_STORAGE_KEY] as { envelope: Envelope } | undefined;
  const viewer = localBag[VIEWER_STORAGE_KEY] as Viewer | undefined;
  if (!stored?.envelope || !viewer) return;
  const account: Account = {
    id: String(viewer.id),
    viewer,
    envelope: stored.envelope,
    addedAt: Date.now(),
  };
  await writeBag({ accounts: [account] });
  await setActive(account.id);
}
