// Multi-account storage for ticket #11.
//
// Legacy ticket #2 auth stored a single encrypted token under
// gh_workflow_token_v1 in chrome.storage.sync. We keep that key as the
// migration source and move to a new container keyed by account id so
// the user can sign in to multiple GitHub identities without trampling
// one another.

import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import type { Viewer } from './github-api';

const ACCOUNTS_KEY = 'gh_workflow_accounts_v1';
const LEGACY_TOKEN_KEY = 'gh_workflow_token_v1';
const LEGACY_VIEWER_KEY = 'gh_workflow_viewer_v1';

interface StoredAccount {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  envelope: Envelope;
}

interface AccountsBag {
  accounts: StoredAccount[];
  activeId: number | null;
}

function viewerKey(id: number): string {
  return `gh_workflow_viewer_${id}`;
}

async function readBag(): Promise<AccountsBag> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_KEY);
  const current = bag[ACCOUNTS_KEY] as AccountsBag | undefined;
  if (current && Array.isArray(current.accounts)) return current;
  return { accounts: [], activeId: null };
}

async function writeBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_KEY]: bag });
}

/**
 * Migrate a legacy single-token record into the multi-account bag if we
 * haven't already. Safe to call repeatedly.
 */
async function migrateLegacy(): Promise<void> {
  const bag = await readBag();
  if (bag.accounts.length > 0) return;
  const [syncSide, localSide] = await Promise.all([
    chrome.storage.sync.get(LEGACY_TOKEN_KEY),
    chrome.storage.local.get(LEGACY_VIEWER_KEY),
  ]);
  const legacy = syncSide[LEGACY_TOKEN_KEY] as { envelope?: Envelope } | undefined;
  const legacyViewer = localSide[LEGACY_VIEWER_KEY] as Viewer | undefined;
  if (!legacy?.envelope || !legacyViewer) return;
  const migrated: StoredAccount = {
    id: legacyViewer.id,
    login: legacyViewer.login,
    name: legacyViewer.name,
    avatar_url: legacyViewer.avatar_url,
    envelope: legacy.envelope,
  };
  await writeBag({ accounts: [migrated], activeId: migrated.id });
  await chrome.storage.local.set({ [viewerKey(migrated.id)]: legacyViewer });
  // Intentionally keep the legacy key around for one release so that
  // older background workers still read it; they no-op if both exist.
}

export interface AccountSummary {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface ActiveAccount {
  summary: AccountSummary;
  viewer: Viewer;
  token: string;
}

export async function listAccounts(): Promise<{
  accounts: AccountSummary[];
  activeId: number | null;
}> {
  await migrateLegacy();
  const bag = await readBag();
  return {
    accounts: bag.accounts.map((a) => ({
      id: a.id,
      login: a.login,
      name: a.name,
      avatar_url: a.avatar_url,
    })),
    activeId: bag.activeId,
  };
}

export async function getActiveAccount(): Promise<ActiveAccount | null> {
  await migrateLegacy();
  const bag = await readBag();
  if (bag.activeId === null) return null;
  const record = bag.accounts.find((a) => a.id === bag.activeId);
  if (!record) return null;
  let token: string;
  try {
    token = await decryptString(record.envelope);
  } catch {
    await removeAccount(record.id);
    return null;
  }
  const viewerBag = await chrome.storage.local.get(viewerKey(record.id));
  const viewer = (viewerBag[viewerKey(record.id)] as Viewer | undefined) ?? {
    id: record.id,
    login: record.login,
    name: record.name,
    avatar_url: record.avatar_url,
    html_url: `https://github.com/${record.login}`,
  };
  const summary: AccountSummary = {
    id: record.id,
    login: record.login,
    name: record.name,
    avatar_url: record.avatar_url,
  };
  return { summary, viewer, token };
}

export async function upsertAccount(token: string, viewer: Viewer): Promise<void> {
  const envelope = await encryptString(token);
  const bag = await readBag();
  const next: StoredAccount = {
    id: viewer.id,
    login: viewer.login,
    name: viewer.name,
    avatar_url: viewer.avatar_url,
    envelope,
  };
  const filtered = bag.accounts.filter((a) => a.id !== viewer.id);
  filtered.push(next);
  await writeBag({ accounts: filtered, activeId: viewer.id });
  await chrome.storage.local.set({ [viewerKey(viewer.id)]: viewer });
}

export async function switchAccount(id: number): Promise<void> {
  const bag = await readBag();
  if (!bag.accounts.some((a) => a.id === id)) return;
  await writeBag({ ...bag, activeId: id });
}

export async function removeAccount(id: number): Promise<void> {
  const bag = await readBag();
  const filtered = bag.accounts.filter((a) => a.id !== id);
  const activeId =
    bag.activeId === id ? filtered[0]?.id ?? null : bag.activeId;
  await writeBag({ accounts: filtered, activeId });
  await chrome.storage.local.remove(viewerKey(id));
  if (filtered.length === 0) {
    await clearCryptoKey();
    await chrome.storage.sync.remove(LEGACY_TOKEN_KEY);
    await chrome.storage.local.remove(LEGACY_VIEWER_KEY);
  }
}
