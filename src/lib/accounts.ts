import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';
import { TOKEN_STORAGE_KEY, VIEWER_STORAGE_KEY, clearStoredAuth, saveToken } from './auth';

export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v2';
export const ACTIVE_ACCOUNT_STORAGE_KEY = 'gh_workflow_active_account_v2';

export interface StoredAccount {
  id: string; // equal to `viewer.id.toString()`
  login: string;
  name: string | null;
  avatar_url: string;
  envelope: Envelope;
}

interface AccountsBag {
  [id: string]: StoredAccount;
}

async function loadAccountsBag(): Promise<AccountsBag> {
  const bag = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as AccountsBag | undefined) ?? {};
}

async function saveAccountsBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: bag });
}

export async function listAccounts(): Promise<StoredAccount[]> {
  const bag = await loadAccountsBag();
  return Object.values(bag).sort((a, b) => a.login.localeCompare(b.login));
}

export async function getActiveAccountId(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_STORAGE_KEY);
  const id = bag[ACTIVE_ACCOUNT_STORAGE_KEY];
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function setActiveAccountId(id: string | null): Promise<void> {
  if (id === null) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_STORAGE_KEY);
    return;
  }
  await chrome.storage.local.set({ [ACTIVE_ACCOUNT_STORAGE_KEY]: id });
}

/**
 * Add (or refresh) an account from a token. Verifies the token against the
 * GitHub API, stores an encrypted envelope in the multi-account bag, and
 * makes the account active — which also writes the token into the v1 slot
 * that the rest of the app already reads.
 */
export async function addAccountFromToken(token: string): Promise<Viewer> {
  const trimmed = token.trim();
  if (!trimmed) throw new GitHubApiError('Token is required', 0, 'other');
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const id = String(viewer.id);
  const bag = await loadAccountsBag();
  bag[id] = {
    id,
    login: viewer.login,
    name: viewer.name,
    avatar_url: viewer.avatar_url,
    envelope,
  };
  await saveAccountsBag(bag);
  await setActiveAccountId(id);
  await saveToken(trimmed, viewer); // keeps v1 storage in sync
  return viewer;
}

/**
 * Switch the active account by id. Decrypts the account's token and writes
 * it into the v1 slot so the existing auth flow picks it up.
 */
export async function switchActiveAccount(id: string): Promise<Viewer> {
  const bag = await loadAccountsBag();
  const account = bag[id];
  if (!account) throw new Error('Unknown account');
  const token = await decryptString(account.envelope);
  const viewer: Viewer = {
    id: Number(account.id),
    login: account.login,
    name: account.name,
    avatar_url: account.avatar_url,
    html_url: `https://github.com/${account.login}`,
  };
  await setActiveAccountId(id);
  await chrome.storage.sync.set({
    [TOKEN_STORAGE_KEY]: { envelope: account.envelope },
  });
  await chrome.storage.local.set({ [VIEWER_STORAGE_KEY]: viewer });
  // Trigger a decrypt sanity check; throws if key rotation invalidated it.
  if (!token) throw new Error('Invalid stored token');
  return viewer;
}

/**
 * Remove an account. If it was the active one, fall back to another stored
 * account or sign out entirely.
 */
export async function removeAccount(id: string): Promise<StoredAccount | null> {
  const bag = await loadAccountsBag();
  delete bag[id];
  await saveAccountsBag(bag);

  const activeId = await getActiveAccountId();
  if (activeId === id) {
    const [fallback] = Object.values(bag);
    if (fallback) {
      await switchActiveAccount(fallback.id);
      return fallback;
    }
    await clearStoredAuth();
    await setActiveAccountId(null);
    return null;
  }
  return null;
}

/**
 * Called on boot to keep the multi-account bag in sync with the legacy v1
 * single-account slot. If someone signs in via the existing PAT / OAuth
 * flows, we mirror the resulting account into the v2 bag.
 */
export async function syncActiveAccountFromLegacy(viewer: Viewer): Promise<void> {
  const id = String(viewer.id);
  const bag = await loadAccountsBag();
  if (bag[id]) {
    await setActiveAccountId(id);
    return;
  }
  const legacyBag = await chrome.storage.sync.get(TOKEN_STORAGE_KEY);
  const stored = legacyBag[TOKEN_STORAGE_KEY] as { envelope: Envelope } | undefined;
  if (!stored?.envelope) return;
  bag[id] = {
    id,
    login: viewer.login,
    name: viewer.name,
    avatar_url: viewer.avatar_url,
    envelope: stored.envelope,
  };
  await saveAccountsBag(bag);
  await setActiveAccountId(id);
}
