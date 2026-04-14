// Multi-account store. Keeps one encrypted token envelope per GitHub login,
// plus an `activeLogin` pointer used by the rest of the app. Migrates the
// legacy single-account layout written by lib/auth on first load.

import { decryptString, encryptString, type Envelope } from './crypto';
import { TOKEN_STORAGE_KEY, VIEWER_STORAGE_KEY } from './auth';
import type { Viewer } from './github-api';

const ACCOUNTS_KEY = 'gh_workflow_accounts_v1';
const ACTIVE_LOGIN_KEY = 'gh_workflow_active_login_v1';

interface StoredAccount {
  envelope: Envelope;
  viewer: Viewer;
}

interface AccountsBag {
  [login: string]: StoredAccount;
}

export interface AccountSummary {
  login: string;
  viewer: Viewer;
}

async function readBag(): Promise<AccountsBag> {
  const sync = await chrome.storage.sync.get(ACCOUNTS_KEY);
  return (sync[ACCOUNTS_KEY] as AccountsBag | undefined) ?? {};
}

async function writeBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_KEY]: bag });
}

async function readActiveLogin(): Promise<string | null> {
  const local = await chrome.storage.local.get(ACTIVE_LOGIN_KEY);
  return (local[ACTIVE_LOGIN_KEY] as string | undefined) ?? null;
}

async function writeActiveLogin(login: string | null): Promise<void> {
  if (login) {
    await chrome.storage.local.set({ [ACTIVE_LOGIN_KEY]: login });
  } else {
    await chrome.storage.local.remove(ACTIVE_LOGIN_KEY);
  }
}

/**
 * Migrate the legacy single-account layout (written by lib/auth) into the
 * multi-account bag. Idempotent and safe to call on every load.
 */
export async function migrateLegacyAccount(): Promise<void> {
  const [bag, legacySync, legacyLocal] = await Promise.all([
    readBag(),
    chrome.storage.sync.get(TOKEN_STORAGE_KEY),
    chrome.storage.local.get(VIEWER_STORAGE_KEY),
  ]);
  const legacyEnvelope = (legacySync[TOKEN_STORAGE_KEY] as { envelope?: Envelope } | undefined)
    ?.envelope;
  const legacyViewer = legacyLocal[VIEWER_STORAGE_KEY] as Viewer | undefined;
  if (!legacyEnvelope || !legacyViewer) return;
  if (bag[legacyViewer.login]) return; // already migrated
  bag[legacyViewer.login] = { envelope: legacyEnvelope, viewer: legacyViewer };
  await writeBag(bag);
  const active = await readActiveLogin();
  if (!active) await writeActiveLogin(legacyViewer.login);
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const bag = await readBag();
  return Object.values(bag).map((entry) => ({
    login: entry.viewer.login,
    viewer: entry.viewer,
  }));
}

export async function getActiveLogin(): Promise<string | null> {
  return readActiveLogin();
}

export async function getActiveAccount(): Promise<{ token: string; viewer: Viewer } | null> {
  const [bag, login] = await Promise.all([readBag(), readActiveLogin()]);
  if (!login) return null;
  const entry = bag[login];
  if (!entry) return null;
  try {
    const token = await decryptString(entry.envelope);
    return { token, viewer: entry.viewer };
  } catch {
    return null;
  }
}

export async function addOrUpdateAccount(token: string, viewer: Viewer): Promise<void> {
  const bag = await readBag();
  const envelope = await encryptString(token);
  bag[viewer.login] = { envelope, viewer };
  await writeBag(bag);
  await writeActiveLogin(viewer.login);
}

export async function removeAccount(login: string): Promise<string | null> {
  const bag = await readBag();
  delete bag[login];
  await writeBag(bag);
  const active = await readActiveLogin();
  if (active === login) {
    const next = Object.keys(bag)[0] ?? null;
    await writeActiveLogin(next);
    return next;
  }
  return active;
}

export async function setActiveLogin(login: string): Promise<void> {
  const bag = await readBag();
  if (!bag[login]) throw new Error(`Unknown account: ${login}`);
  await writeActiveLogin(login);
}

export async function clearAllAccounts(): Promise<void> {
  await chrome.storage.sync.remove(ACCOUNTS_KEY);
  await chrome.storage.local.remove(ACTIVE_LOGIN_KEY);
}
