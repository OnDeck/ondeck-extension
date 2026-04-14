// Multi-account support. Each account has its own encrypted token and
// viewer profile. The "active" account id drives which credentials the
// rest of the extension uses.
//
// Storage layout (chrome.storage.sync):
//   gh_workflow_accounts_v1: { accounts: AccountRecord[]; activeId: string | null }
//
// AccountRecord.envelope stores the AES-GCM encrypted token produced by
// lib/crypto.ts. The key itself lives in chrome.storage.local so that a
// pure-sync backup cannot recover tokens.

import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

const ACCOUNTS_KEY = 'gh_workflow_accounts_v1';

export interface AccountRecord {
  id: string; // stable uuid
  login: string;
  name: string | null;
  avatar_url: string;
  envelope: Envelope;
  addedAt: string; // ISO
}

interface AccountsStore {
  accounts: AccountRecord[];
  activeId: string | null;
}

async function readStore(): Promise<AccountsStore> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_KEY);
  const store = bag[ACCOUNTS_KEY] as AccountsStore | undefined;
  return store ?? { accounts: [], activeId: null };
}

async function writeStore(store: AccountsStore): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_KEY]: store });
}

function makeId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface AccountSummary {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string;
  isActive: boolean;
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const store = await readStore();
  return store.accounts.map((a) => ({
    id: a.id,
    login: a.login,
    name: a.name,
    avatar_url: a.avatar_url,
    isActive: a.id === store.activeId,
  }));
}

export async function addAccount(token: string): Promise<AccountSummary> {
  const trimmed = token.trim();
  if (!trimmed) throw new GitHubApiError('Token is required', 0, 'other');
  const viewer: Viewer = await fetchViewer(trimmed);

  const store = await readStore();
  // Prevent duplicate by login — reuse id if it exists.
  const existing = store.accounts.find((a) => a.login === viewer.login);
  const envelope = await encryptString(trimmed);
  let record: AccountRecord;
  if (existing) {
    record = {
      ...existing,
      name: viewer.name,
      avatar_url: viewer.avatar_url,
      envelope,
    };
    store.accounts = store.accounts.map((a) => (a.id === existing.id ? record : a));
  } else {
    record = {
      id: makeId(),
      login: viewer.login,
      name: viewer.name,
      avatar_url: viewer.avatar_url,
      envelope,
      addedAt: new Date().toISOString(),
    };
    store.accounts.push(record);
  }
  store.activeId = record.id;
  await writeStore(store);
  return {
    id: record.id,
    login: record.login,
    name: record.name,
    avatar_url: record.avatar_url,
    isActive: true,
  };
}

export async function removeAccount(id: string): Promise<void> {
  const store = await readStore();
  store.accounts = store.accounts.filter((a) => a.id !== id);
  if (store.activeId === id) {
    store.activeId = store.accounts[0]?.id ?? null;
  }
  await writeStore(store);
}

export async function setActiveAccount(id: string): Promise<void> {
  const store = await readStore();
  if (!store.accounts.some((a) => a.id === id)) {
    throw new Error(`Unknown account id: ${id}`);
  }
  store.activeId = id;
  await writeStore(store);
}

export async function getActiveAccountToken(): Promise<string | null> {
  const store = await readStore();
  const active = store.accounts.find((a) => a.id === store.activeId);
  if (!active) return null;
  try {
    return await decryptString(active.envelope);
  } catch {
    return null;
  }
}

export async function getActiveAccountViewer(): Promise<Viewer | null> {
  const store = await readStore();
  const active = store.accounts.find((a) => a.id === store.activeId);
  if (!active) return null;
  // We don't persist the full Viewer separately in this store; construct the
  // subset we know. Consumers needing fresh data should call fetchViewer.
  return {
    id: 0,
    login: active.login,
    name: active.name,
    avatar_url: active.avatar_url,
    html_url: `https://github.com/${active.login}`,
  };
}
