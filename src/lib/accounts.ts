// Multi-account storage layer. Wraps auth.ts to support multiple GitHub
// accounts, each with an independently encrypted token envelope. Only the
// token of the active account is ever "hot" in memory.

import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, type Viewer } from './github-api';

const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v1';
const ACTIVE_ACCOUNT_KEY = 'gh_workflow_active_account_v1';

export interface StoredAccount {
  id: string;
  viewer: Viewer;
  envelope: Envelope;
  createdAt: number;
}

export interface AccountSummary {
  id: string;
  viewer: Viewer;
  isActive: boolean;
}

interface AccountBag {
  [id: string]: StoredAccount;
}

async function readAll(): Promise<AccountBag> {
  const bag = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as AccountBag | undefined) ?? {};
}

async function writeAll(accounts: AccountBag): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: accounts });
}

async function readActiveId(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_KEY);
  return (bag[ACTIVE_ACCOUNT_KEY] as string | undefined) ?? null;
}

async function writeActiveId(id: string | null): Promise<void> {
  if (id === null) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_ACCOUNT_KEY]: id });
  }
}

function accountId(viewer: Viewer): string {
  return `gh-${viewer.id}`;
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const [accounts, activeId] = await Promise.all([readAll(), readActiveId()]);
  return Object.values(accounts).map((a) => ({
    id: a.id,
    viewer: a.viewer,
    isActive: a.id === activeId,
  }));
}

export async function addAccountWithToken(token: string): Promise<AccountSummary> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('Token is required');
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const id = accountId(viewer);
  const accounts = await readAll();
  accounts[id] = { id, viewer, envelope, createdAt: Date.now() };
  await writeAll(accounts);
  await writeActiveId(id);
  return { id, viewer, isActive: true };
}

export async function switchToAccount(id: string): Promise<AccountSummary | null> {
  const accounts = await readAll();
  const found = accounts[id];
  if (!found) return null;
  await writeActiveId(id);
  return { id, viewer: found.viewer, isActive: true };
}

export async function removeAccount(id: string): Promise<void> {
  const [accounts, activeId] = await Promise.all([readAll(), readActiveId()]);
  if (!accounts[id]) return;
  delete accounts[id];
  await writeAll(accounts);
  if (activeId === id) {
    const remaining = Object.keys(accounts);
    await writeActiveId(remaining[0] ?? null);
  }
}

/**
 * Return the active account's decrypted token + viewer, or null when no
 * account is signed in. Isolation: only the active envelope is decrypted.
 */
export async function getActiveCredentials(): Promise<{
  token: string;
  viewer: Viewer;
} | null> {
  const [accounts, activeId] = await Promise.all([readAll(), readActiveId()]);
  if (!activeId) return null;
  const found = accounts[activeId];
  if (!found) return null;
  try {
    const token = await decryptString(found.envelope);
    return { token, viewer: found.viewer };
  } catch {
    return null;
  }
}

export async function clearAllAccounts(): Promise<void> {
  await writeAll({});
  await writeActiveId(null);
}
