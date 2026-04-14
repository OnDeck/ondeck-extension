// Multi-account storage layer. Tokens are encrypted per-account in
// chrome.storage.sync; viewer profiles cache to chrome.storage.local.
// The "active" account id is also stored in local so it stays
// machine-specific.

import { decryptString, encryptString, type Envelope } from './crypto';
import type { Viewer } from './github-api';

export const ACCOUNTS_KEY = 'gh_workflow_accounts_v1';
export const ACTIVE_ACCOUNT_KEY = 'gh_workflow_active_account_v1';

export interface StoredAccount {
  id: string; // viewer.login lowercased
  envelope: Envelope;
  viewer: Viewer;
}

interface AccountsBag {
  [id: string]: StoredAccount;
}

async function readBag(): Promise<AccountsBag> {
  const sync = await chrome.storage.sync.get(ACCOUNTS_KEY);
  return (sync[ACCOUNTS_KEY] as AccountsBag | undefined) ?? {};
}

async function writeBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_KEY]: bag });
}

export async function listAccounts(): Promise<StoredAccount[]> {
  const bag = await readBag();
  return Object.values(bag).sort((a, b) => a.id.localeCompare(b.id));
}

export async function addAccount(token: string, viewer: Viewer): Promise<StoredAccount> {
  const envelope = await encryptString(token);
  const account: StoredAccount = { id: viewer.login.toLowerCase(), envelope, viewer };
  const bag = await readBag();
  bag[account.id] = account;
  await writeBag(bag);
  await setActiveAccount(account.id);
  return account;
}

export async function removeAccount(id: string): Promise<void> {
  const bag = await readBag();
  delete bag[id];
  await writeBag(bag);
  const activeBag = await chrome.storage.local.get(ACTIVE_ACCOUNT_KEY);
  if (activeBag[ACTIVE_ACCOUNT_KEY] === id) {
    const fallback = Object.keys(bag)[0] ?? null;
    if (fallback) {
      await setActiveAccount(fallback);
    } else {
      await chrome.storage.local.remove(ACTIVE_ACCOUNT_KEY);
    }
  }
}

export async function setActiveAccount(id: string): Promise<void> {
  await chrome.storage.local.set({ [ACTIVE_ACCOUNT_KEY]: id });
}

export async function getActiveAccountId(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_KEY);
  return (bag[ACTIVE_ACCOUNT_KEY] as string | undefined) ?? null;
}

export async function getActiveAccount(): Promise<{
  account: StoredAccount;
  token: string;
} | null> {
  const id = await getActiveAccountId();
  if (!id) return null;
  const bag = await readBag();
  const account = bag[id];
  if (!account) return null;
  try {
    const token = await decryptString(account.envelope);
    return { account, token };
  } catch {
    return null;
  }
}
