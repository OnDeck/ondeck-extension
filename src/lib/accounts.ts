// Multi-account storage.
//
// Each account owns its own encrypted token, viewer profile, and stats so
// switching accounts swaps the entire workspace cleanly. Tokens use the
// existing AES-GCM envelope helpers from lib/crypto so they aren't sitting
// in plaintext in chrome.storage.
//
// Storage layout (all in chrome.storage.local so accounts do not sync
// across machines and tokens stay tied to the device):
//
//   gh_workflow_accounts_v1        -> { activeId: string|null, accounts: Account[] }
//
// We deliberately do NOT use chrome.storage.sync for this ticket because
// per-device isolation is the safer default for multi-tenant token storage.

import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, type Viewer } from './github-api';

const ACCOUNTS_KEY = 'gh_workflow_accounts_v1';

export interface Account {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  envelope: Envelope;
  addedAt: number;
}

interface AccountsState {
  activeId: string | null;
  accounts: Account[];
}

const EMPTY: AccountsState = { activeId: null, accounts: [] };

async function readState(): Promise<AccountsState> {
  const bag = await chrome.storage.local.get(ACCOUNTS_KEY);
  const stored = bag[ACCOUNTS_KEY] as AccountsState | undefined;
  if (!stored) return { ...EMPTY };
  return {
    activeId: stored.activeId ?? null,
    accounts: Array.isArray(stored.accounts) ? stored.accounts : [],
  };
}

async function writeState(state: AccountsState): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNTS_KEY]: state });
}

export interface AccountSummary {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  isActive: boolean;
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const state = await readState();
  return state.accounts.map((acc) => ({
    id: acc.id,
    login: acc.login,
    name: acc.name,
    avatarUrl: acc.avatarUrl,
    isActive: acc.id === state.activeId,
  }));
}

export async function getActiveAccountId(): Promise<string | null> {
  const state = await readState();
  return state.activeId;
}

export async function getActiveAccountToken(): Promise<{
  account: AccountSummary;
  token: string;
} | null> {
  const state = await readState();
  if (!state.activeId) return null;
  const account = state.accounts.find((a) => a.id === state.activeId);
  if (!account) return null;
  try {
    const token = await decryptString(account.envelope);
    return {
      account: {
        id: account.id,
        login: account.login,
        name: account.name,
        avatarUrl: account.avatarUrl,
        isActive: true,
      },
      token,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a PAT against /user, encrypt it, and persist a new account. If
 * an account with the same login already exists we replace its token (so
 * users can rotate PATs without losing their stats history).
 */
export async function addAccount(token: string): Promise<AccountSummary> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Token is required');
  }
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const state = await readState();
  const existing = state.accounts.find((a) => a.login === viewer.login);
  let account: Account;
  if (existing) {
    account = {
      ...existing,
      name: viewer.name,
      avatarUrl: viewer.avatar_url,
      envelope,
    };
    state.accounts = state.accounts.map((a) =>
      a.id === existing.id ? account : a,
    );
  } else {
    account = {
      id: `${viewer.login}-${viewer.id}`,
      login: viewer.login,
      name: viewer.name,
      avatarUrl: viewer.avatar_url,
      envelope,
      addedAt: Date.now(),
    };
    state.accounts.push(account);
  }
  state.activeId = account.id;
  await writeState(state);
  return {
    id: account.id,
    login: account.login,
    name: account.name,
    avatarUrl: account.avatarUrl,
    isActive: true,
  };
}

export async function switchAccount(id: string): Promise<void> {
  const state = await readState();
  if (!state.accounts.some((a) => a.id === id)) {
    throw new Error('Unknown account');
  }
  state.activeId = id;
  await writeState(state);
}

export async function removeAccount(id: string): Promise<void> {
  const state = await readState();
  state.accounts = state.accounts.filter((a) => a.id !== id);
  if (state.activeId === id) {
    state.activeId = state.accounts[0]?.id ?? null;
  }
  await writeState(state);
}

/**
 * Helper that fetches a viewer profile for the active account (used by
 * the popup's account-aware components without re-implementing the
 * decrypt logic).
 */
export async function fetchActiveViewer(): Promise<Viewer | null> {
  const active = await getActiveAccountToken();
  if (!active) return null;
  return fetchViewer(active.token);
}
