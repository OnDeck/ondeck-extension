import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

// Legacy v1 keys (pre multi-account). Kept for migration only.
const LEGACY_TOKEN_KEY = 'gh_workflow_token_v1';
const LEGACY_VIEWER_KEY = 'gh_workflow_viewer_v1';

// Multi-account storage (v2): keyed by numeric GitHub user id.
export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v2';
export const ACTIVE_ACCOUNT_KEY = 'gh_workflow_active_account_v2';
export const VIEWERS_CACHE_KEY = 'gh_workflow_viewers_v2';

// Re-export the original key name so existing imports (service worker) keep
// working. The service worker listens on storage changes for this key to
// decide whether the user is signed in.
export const TOKEN_STORAGE_KEY = ACCOUNTS_STORAGE_KEY;

interface StoredAccount {
  envelope: Envelope;
  summary: {
    login: string;
    name: string | null;
    avatar_url: string;
  };
}

type AccountsBag = Record<string, StoredAccount>;
type ViewersCache = Record<string, Viewer>;

const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
  activeId: number | null;
  accounts: AccountSummary[];
}

export interface AccountSummary {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

// ---------- storage helpers ----------

async function readAccounts(): Promise<AccountsBag> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as AccountsBag | undefined) ?? {};
}

async function writeAccounts(next: AccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_STORAGE_KEY]: next });
}

async function readActiveId(): Promise<number | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_KEY);
  const value = bag[ACTIVE_ACCOUNT_KEY] as number | undefined;
  return typeof value === 'number' ? value : null;
}

async function writeActiveId(id: number | null): Promise<void> {
  if (id === null) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_ACCOUNT_KEY]: id });
  }
}

async function readViewersCache(): Promise<ViewersCache> {
  const bag = await chrome.storage.local.get(VIEWERS_CACHE_KEY);
  return (bag[VIEWERS_CACHE_KEY] as ViewersCache | undefined) ?? {};
}

async function writeViewersCache(next: ViewersCache): Promise<void> {
  await chrome.storage.local.set({ [VIEWERS_CACHE_KEY]: next });
}

function toSummary(viewer: Viewer): StoredAccount['summary'] {
  return { login: viewer.login, name: viewer.name, avatar_url: viewer.avatar_url };
}

function listSummaries(accounts: AccountsBag): AccountSummary[] {
  return Object.entries(accounts)
    .map(([id, account]) => ({ id: Number(id), ...account.summary }))
    .sort((a, b) => a.login.localeCompare(b.login));
}

// ---------- legacy migration ----------

async function migrateLegacyIfNeeded(): Promise<void> {
  const [syncBag, localBag] = await Promise.all([
    chrome.storage.sync.get([LEGACY_TOKEN_KEY, ACCOUNTS_STORAGE_KEY]),
    chrome.storage.local.get(LEGACY_VIEWER_KEY),
  ]);
  if (syncBag[ACCOUNTS_STORAGE_KEY]) return;
  const legacyEnvelope = (
    syncBag[LEGACY_TOKEN_KEY] as { envelope?: Envelope } | undefined
  )?.envelope;
  const legacyViewer = localBag[LEGACY_VIEWER_KEY] as Viewer | undefined;
  if (!legacyEnvelope || !legacyViewer) return;
  const accounts: AccountsBag = {
    [legacyViewer.id]: {
      envelope: legacyEnvelope,
      summary: toSummary(legacyViewer),
    },
  };
  const cache: ViewersCache = { [legacyViewer.id]: legacyViewer };
  await Promise.all([
    writeAccounts(accounts),
    writeViewersCache(cache),
    writeActiveId(legacyViewer.id),
    chrome.storage.sync.remove(LEGACY_TOKEN_KEY),
    chrome.storage.local.remove(LEGACY_VIEWER_KEY),
  ]);
}

// ---------- public API ----------

export async function getStoredAuth(): Promise<AuthState> {
  await migrateLegacyIfNeeded();
  const [accounts, cache, activeId] = await Promise.all([
    readAccounts(),
    readViewersCache(),
    readActiveId(),
  ]);
  const summaries = listSummaries(accounts);
  if (summaries.length === 0 || activeId === null || !accounts[activeId]) {
    return { token: null, viewer: null, activeId: null, accounts: summaries };
  }
  try {
    const token = await decryptString(accounts[activeId].envelope);
    return {
      token,
      viewer: cache[activeId] ?? null,
      activeId,
      accounts: summaries,
    };
  } catch {
    // Key rotation or corruption — drop this account so the user can re-auth.
    delete accounts[activeId];
    delete cache[activeId];
    await Promise.all([writeAccounts(accounts), writeViewersCache(cache), writeActiveId(null)]);
    return {
      token: null,
      viewer: null,
      activeId: null,
      accounts: listSummaries(accounts),
    };
  }
}

export async function saveToken(token: string, viewer: Viewer): Promise<void> {
  const envelope = await encryptString(token);
  const accounts = await readAccounts();
  accounts[viewer.id] = { envelope, summary: toSummary(viewer) };
  const cache = await readViewersCache();
  cache[viewer.id] = viewer;
  await Promise.all([
    writeAccounts(accounts),
    writeViewersCache(cache),
    writeActiveId(viewer.id),
  ]);
}

export async function switchActiveAccount(id: number): Promise<AuthState> {
  const accounts = await readAccounts();
  if (!accounts[id]) {
    return getStoredAuth();
  }
  await writeActiveId(id);
  return getStoredAuth();
}

export async function removeAccount(id: number): Promise<AuthState> {
  const [accounts, cache, activeId] = await Promise.all([
    readAccounts(),
    readViewersCache(),
    readActiveId(),
  ]);
  delete accounts[id];
  delete cache[id];
  const nextActive =
    activeId === id
      ? (Object.keys(accounts)[0] ? Number(Object.keys(accounts)[0]) : null)
      : activeId;
  await Promise.all([
    writeAccounts(accounts),
    writeViewersCache(cache),
    writeActiveId(nextActive),
  ]);
  if (Object.keys(accounts).length === 0) {
    await clearCryptoKey();
  }
  return getStoredAuth();
}

export async function clearStoredAuth(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.remove(ACCOUNTS_STORAGE_KEY),
    chrome.storage.local.remove([ACTIVE_ACCOUNT_KEY, VIEWERS_CACHE_KEY]),
    clearCryptoKey(),
  ]);
}

/**
 * Verify a token with GitHub, persist it (encrypted) alongside the viewer
 * profile, and return the viewer. Throws GitHubApiError on failure.
 */
export async function signInWithToken(token: string): Promise<Viewer> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new GitHubApiError('Token is required', 0, 'other');
  }
  const viewer = await fetchViewer(trimmed);
  await saveToken(trimmed, viewer);
  return viewer;
}

export async function signOut(): Promise<void> {
  // Sign out = remove only the currently active account. Other accounts stay
  // signed in and are available via the account switcher.
  const activeId = await readActiveId();
  if (activeId !== null) {
    await removeAccount(activeId);
  } else {
    await clearStoredAuth();
  }
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
