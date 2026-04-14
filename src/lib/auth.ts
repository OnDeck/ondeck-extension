import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

// ---------- Storage keys ----------
//
// v1 stored a single token in sync + viewer in local. v2 (this file) stores
// a map of accounts + the active account id. We migrate v1 on first read.
export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1'; // legacy
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1'; // legacy
export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v2';

const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
}

export interface AccountSummary {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  addedAt: string;
}

export interface AccountsState {
  active: AccountSummary | null;
  accounts: AccountSummary[];
}

interface StoredAccount {
  id: number;
  viewer: Viewer;
  envelope: Envelope;
  addedAt: string;
}

interface AccountsBag {
  activeId: number | null;
  accounts: StoredAccount[];
}

// ---------- Internal bag helpers ----------

async function loadBag(): Promise<AccountsBag> {
  const sync = await chrome.storage.sync.get(ACCOUNTS_STORAGE_KEY);
  const stored = sync[ACCOUNTS_STORAGE_KEY] as AccountsBag | undefined;
  if (stored && Array.isArray(stored.accounts)) {
    return stored;
  }
  // Migrate v1 → v2 if present.
  const [legacyToken, legacyViewer] = await Promise.all([
    chrome.storage.sync.get(TOKEN_STORAGE_KEY),
    chrome.storage.local.get(VIEWER_STORAGE_KEY),
  ]);
  const envelope = (legacyToken[TOKEN_STORAGE_KEY] as { envelope: Envelope } | undefined)
    ?.envelope;
  const viewer = legacyViewer[VIEWER_STORAGE_KEY] as Viewer | undefined;
  if (envelope && viewer) {
    const migrated: AccountsBag = {
      activeId: viewer.id,
      accounts: [
        {
          id: viewer.id,
          viewer,
          envelope,
          addedAt: new Date().toISOString(),
        },
      ],
    };
    await saveBag(migrated);
    await chrome.storage.sync.remove(TOKEN_STORAGE_KEY);
    await chrome.storage.local.remove(VIEWER_STORAGE_KEY);
    return migrated;
  }
  return { activeId: null, accounts: [] };
}

async function saveBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_STORAGE_KEY]: bag });
}

function toSummary(a: StoredAccount): AccountSummary {
  return {
    id: a.id,
    login: a.viewer.login,
    name: a.viewer.name,
    avatar_url: a.viewer.avatar_url,
    addedAt: a.addedAt,
  };
}

// ---------- Public auth surface ----------

export async function getStoredAuth(): Promise<AuthState> {
  const bag = await loadBag();
  if (!bag.activeId) return { token: null, viewer: null };
  const account = bag.accounts.find((a) => a.id === bag.activeId);
  if (!account) return { token: null, viewer: null };
  try {
    const token = await decryptString(account.envelope);
    return { token, viewer: account.viewer };
  } catch {
    // Crypto key rotation — nuke everything to recover.
    await clearAllAccounts();
    return { token: null, viewer: null };
  }
}

export async function listAccounts(): Promise<AccountsState> {
  const bag = await loadBag();
  const accounts = bag.accounts.map(toSummary);
  const active = accounts.find((a) => a.id === bag.activeId) ?? null;
  return { active, accounts };
}

export async function addAccount(token: string): Promise<Viewer> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new GitHubApiError('Token is required', 0, 'other');
  }
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const bag = await loadBag();
  const without = bag.accounts.filter((a) => a.id !== viewer.id);
  const next: AccountsBag = {
    activeId: viewer.id,
    accounts: [
      ...without,
      {
        id: viewer.id,
        viewer,
        envelope,
        addedAt: new Date().toISOString(),
      },
    ],
  };
  await saveBag(next);
  return viewer;
}

export async function setActiveAccount(id: number): Promise<void> {
  const bag = await loadBag();
  if (!bag.accounts.some((a) => a.id === id)) return;
  await saveBag({ ...bag, activeId: id });
}

export async function removeAccount(id: number): Promise<void> {
  const bag = await loadBag();
  const remaining = bag.accounts.filter((a) => a.id !== id);
  const activeId =
    bag.activeId === id ? (remaining[0]?.id ?? null) : bag.activeId;
  if (remaining.length === 0) {
    await chrome.storage.sync.remove(ACCOUNTS_STORAGE_KEY);
    await clearCryptoKey();
    return;
  }
  await saveBag({ activeId, accounts: remaining });
}

async function clearAllAccounts(): Promise<void> {
  await chrome.storage.sync.remove(ACCOUNTS_STORAGE_KEY);
  await clearCryptoKey();
}

/** Convenience wrapper kept for compatibility with the single-account path. */
export async function saveToken(token: string, _viewer: Viewer): Promise<void> {
  await addAccount(token);
}

export async function clearStoredAuth(): Promise<void> {
  await clearAllAccounts();
}

export async function signInWithToken(token: string): Promise<Viewer> {
  return addAccount(token);
}

export async function signOut(): Promise<void> {
  // Sign-out removes only the active account; if there are siblings we
  // switch to the next one so the popup stays in a signed-in view.
  const bag = await loadBag();
  if (!bag.activeId) return;
  await removeAccount(bag.activeId);
}

// ---------- OAuth ----------

function buildRedirectUri(): string {
  return chrome.identity.getRedirectURL('oauth2');
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isOAuthConfigured(): boolean {
  return OAUTH_CLIENT_ID.length > 0;
}

export async function signInWithOAuth(): Promise<Viewer> {
  const exchangeUrl = (import.meta.env?.VITE_GITHUB_OAUTH_EXCHANGE_URL ?? '') as string;
  if (!OAUTH_CLIENT_ID || !exchangeUrl) {
    throw new GitHubApiError(
      'OAuth is not configured. Use a Personal Access Token instead.',
      0,
      'other',
    );
  }
  const redirectUri = buildRedirectUri();
  const state = randomState();
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:user notifications repo');
  authUrl.searchParams.set('state', state);

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });
  if (!responseUrl) {
    throw new GitHubApiError('OAuth flow was cancelled', 0, 'other');
  }
  const parsed = new URL(responseUrl);
  const returnedState = parsed.searchParams.get('state');
  const code = parsed.searchParams.get('code');
  if (returnedState !== state) {
    throw new GitHubApiError('OAuth state mismatch', 0, 'other');
  }
  if (!code) {
    throw new GitHubApiError('OAuth response missing code', 0, 'other');
  }
  const exchange = await fetch(exchangeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
  });
  if (!exchange.ok) {
    throw new GitHubApiError('Token exchange failed', exchange.status, 'other');
  }
  const { access_token: accessToken } = (await exchange.json()) as {
    access_token?: string;
  };
  if (!accessToken) {
    throw new GitHubApiError('Token exchange response missing access_token', 0, 'other');
  }
  return signInWithToken(accessToken);
}
