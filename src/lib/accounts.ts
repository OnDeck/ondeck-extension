// Multi-account storage. Each saved GitHub identity is keyed by the
// numeric user id and carries its own encrypted token envelope and a
// cached viewer snapshot. A pointer in chrome.storage.local tracks
// which account is currently active.

import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, type Viewer } from './github-api';

export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v1';
export const ACTIVE_ACCOUNT_KEY = 'gh_workflow_active_account_v1';

interface StoredAccount {
  id: number;
  viewer: Viewer;
  envelope: Envelope;
}

type AccountsBag = Record<string, StoredAccount>;

export interface AccountSummary {
  id: number;
  viewer: Viewer;
  active: boolean;
}

async function readBag(): Promise<AccountsBag> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as AccountsBag | undefined) ?? {};
}

async function writeBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_STORAGE_KEY]: bag });
}

async function readActiveId(): Promise<number | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_KEY);
  const id = bag[ACTIVE_ACCOUNT_KEY] as number | undefined;
  return typeof id === 'number' ? id : null;
}

async function writeActiveId(id: number | null): Promise<void> {
  if (id === null) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_ACCOUNT_KEY]: id });
  }
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const [bag, activeId] = await Promise.all([readBag(), readActiveId()]);
  return Object.values(bag).map((account) => ({
    id: account.id,
    viewer: account.viewer,
    active: account.id === activeId,
  }));
}

export async function addAccount(token: string): Promise<Viewer> {
  const viewer = await fetchViewer(token);
  const envelope = await encryptString(token);
  const bag = await readBag();
  bag[String(viewer.id)] = { id: viewer.id, viewer, envelope };
  await writeBag(bag);
  await writeActiveId(viewer.id);
  return viewer;
}

export async function getActiveAccount(): Promise<{
  token: string;
  viewer: Viewer;
} | null> {
  const [bag, activeId] = await Promise.all([readBag(), readActiveId()]);
  let account: StoredAccount | undefined;
  if (activeId !== null) account = bag[String(activeId)];
  if (!account) {
    const first = Object.values(bag)[0];
    if (!first) return null;
    account = first;
    await writeActiveId(first.id);
  }
  try {
    const token = await decryptString(account.envelope);
    return { token, viewer: account.viewer };
  } catch {
    return null;
  }
}

export async function switchActiveAccount(id: number): Promise<void> {
  const bag = await readBag();
  if (!bag[String(id)]) return;
  await writeActiveId(id);
}

export async function removeAccount(id: number): Promise<number | null> {
  const bag = await readBag();
  delete bag[String(id)];
  await writeBag(bag);
  const remaining = Object.values(bag);
  const nextActive = remaining[0]?.id ?? null;
  await writeActiveId(nextActive);
  return nextActive;
}

export async function clearAllAccounts(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.remove(ACCOUNTS_STORAGE_KEY),
    chrome.storage.local.remove(ACTIVE_ACCOUNT_KEY),
  ]);
}
