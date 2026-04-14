// Multi-account store. Each account holds an encrypted token envelope
// and a snapshot of the authenticated viewer, keyed by GitHub login so
// tokens and stats stay isolated per account. A single `activeLogin`
// pointer selects which account the popup + service worker act on.

import { decryptString, encryptString, type Envelope } from './crypto';
import type { Viewer } from './github-api';

const ACCOUNTS_KEY = 'gh_workflow_accounts_v1';

// Legacy keys used by the single-account auth ticket (#2). We migrate
// transparently on first load if they are still present.
const LEGACY_TOKEN_SYNC_KEY = 'gh_workflow_token_v1';
const LEGACY_VIEWER_LOCAL_KEY = 'gh_workflow_viewer_v1';

export interface StoredAccount {
  viewer: Viewer;
  envelope: Envelope;
  addedAt: number;
}

export interface AccountsState {
  activeLogin: string | null;
  accounts: Record<string, StoredAccount>;
}

const EMPTY: AccountsState = { activeLogin: null, accounts: {} };

async function readRaw(): Promise<AccountsState> {
  const bag = await chrome.storage.local.get(ACCOUNTS_KEY);
  const state = bag[ACCOUNTS_KEY] as AccountsState | undefined;
  if (!state) return { ...EMPTY, accounts: {} };
  return { activeLogin: state.activeLogin ?? null, accounts: state.accounts ?? {} };
}

async function writeRaw(state: AccountsState): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNTS_KEY]: state });
}

async function migrateLegacyIfNeeded(state: AccountsState): Promise<AccountsState> {
  if (Object.keys(state.accounts).length > 0) return state;
  const [syncBag, localBag] = await Promise.all([
    chrome.storage.sync.get(LEGACY_TOKEN_SYNC_KEY),
    chrome.storage.local.get(LEGACY_VIEWER_LOCAL_KEY),
  ]);
  const legacyToken = syncBag[LEGACY_TOKEN_SYNC_KEY] as { envelope?: Envelope } | undefined;
  const legacyViewer = localBag[LEGACY_VIEWER_LOCAL_KEY] as Viewer | undefined;
  if (!legacyToken?.envelope || !legacyViewer) return state;
  const migrated: AccountsState = {
    activeLogin: legacyViewer.login,
    accounts: {
      [legacyViewer.login]: {
        viewer: legacyViewer,
        envelope: legacyToken.envelope,
        addedAt: Date.now(),
      },
    },
  };
  await writeRaw(migrated);
  await chrome.storage.sync.remove(LEGACY_TOKEN_SYNC_KEY);
  await chrome.storage.local.remove(LEGACY_VIEWER_LOCAL_KEY);
  return migrated;
}

export async function readAccounts(): Promise<AccountsState> {
  const raw = await readRaw();
  return migrateLegacyIfNeeded(raw);
}

export interface ActiveAccount {
  token: string | null;
  viewer: Viewer | null;
}

export async function readActiveAccount(): Promise<ActiveAccount> {
  const state = await readAccounts();
  if (!state.activeLogin) return { token: null, viewer: null };
  const entry = state.accounts[state.activeLogin];
  if (!entry) return { token: null, viewer: null };
  try {
    const token = await decryptString(entry.envelope);
    return { token, viewer: entry.viewer };
  } catch {
    // Crypto key rotated — drop the broken account and pick another.
    return removeAccount(state.activeLogin).then(readActiveAccount);
  }
}

export async function upsertAccount(token: string, viewer: Viewer): Promise<AccountsState> {
  const envelope = await encryptString(token);
  const state = await readAccounts();
  state.accounts[viewer.login] = {
    viewer,
    envelope,
    addedAt: state.accounts[viewer.login]?.addedAt ?? Date.now(),
  };
  state.activeLogin = viewer.login;
  await writeRaw(state);
  return state;
}

export async function switchAccount(login: string): Promise<AccountsState> {
  const state = await readAccounts();
  if (!state.accounts[login]) return state;
  state.activeLogin = login;
  await writeRaw(state);
  return state;
}

export async function removeAccount(login: string): Promise<AccountsState> {
  const state = await readAccounts();
  delete state.accounts[login];
  if (state.activeLogin === login) {
    const remaining = Object.keys(state.accounts);
    state.activeLogin = remaining[0] ?? null;
  }
  await writeRaw(state);
  return state;
}

export async function listAccounts(): Promise<{
  active: string | null;
  accounts: { login: string; viewer: Viewer }[];
}> {
  const state = await readAccounts();
  return {
    active: state.activeLogin,
    accounts: Object.values(state.accounts)
      .sort((a, b) => a.addedAt - b.addedAt)
      .map((a) => ({ login: a.viewer.login, viewer: a.viewer })),
  };
}
