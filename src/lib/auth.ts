import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

// --- Storage keys ---

// Legacy single-account keys retained for migration.
export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1';
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1';

// Multi-account keys (issue #11).
export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v1';
export const VIEWERS_STORAGE_KEY = 'gh_workflow_viewers_v1';
export const ACTIVE_ACCOUNT_STORAGE_KEY = 'gh_workflow_active_account_v1';

const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
  accountId: string | null;
}

export interface AccountRecord {
  id: string;
  login: string;
  envelope: Envelope;
}

interface StoredAccountsBag {
  [id: string]: AccountRecord;
}

interface StoredViewersBag {
  [id: string]: Viewer;
}

// ---------- storage helpers ----------

async function loadAccounts(): Promise<StoredAccountsBag> {
  const bag = await chrome.storage.sync.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as StoredAccountsBag | undefined) ?? {};
}

async function saveAccounts(accounts: StoredAccountsBag): Promise<void> {
  await chrome.storage.sync.set({ [ACCOUNTS_STORAGE_KEY]: accounts });
}

async function loadViewers(): Promise<StoredViewersBag> {
  const bag = await chrome.storage.local.get(VIEWERS_STORAGE_KEY);
  return (bag[VIEWERS_STORAGE_KEY] as StoredViewersBag | undefined) ?? {};
}

async function saveViewers(viewers: StoredViewersBag): Promise<void> {
  await chrome.storage.local.set({ [VIEWERS_STORAGE_KEY]: viewers });
}

async function loadActiveId(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_ACCOUNT_STORAGE_KEY);
  return (bag[ACTIVE_ACCOUNT_STORAGE_KEY] as string | undefined) ?? null;
}

async function saveActiveId(id: string | null): Promise<void> {
  if (!id) {
    await chrome.storage.local.remove(ACTIVE_ACCOUNT_STORAGE_KEY);
    return;
  }
  await chrome.storage.local.set({ [ACTIVE_ACCOUNT_STORAGE_KEY]: id });
}

// Migrate legacy single-account data into the accounts bag on first run.
async function migrateLegacy(): Promise<void> {
  const [legacySync, legacyLocal] = await Promise.all([
    chrome.storage.sync.get(TOKEN_STORAGE_KEY),
    chrome.storage.local.get(VIEWER_STORAGE_KEY),
  ]);
  const legacyToken = legacySync[TOKEN_STORAGE_KEY] as
    | { envelope: Envelope }
    | undefined;
  const legacyViewer = legacyLocal[VIEWER_STORAGE_KEY] as Viewer | undefined;
  if (!legacyToken?.envelope || !legacyViewer) return;

  const accounts = await loadAccounts();
  const id = String(legacyViewer.id);
  if (!accounts[id]) {
    accounts[id] = { id, login: legacyViewer.login, envelope: legacyToken.envelope };
    await saveAccounts(accounts);
  }
  const viewers = await loadViewers();
  if (!viewers[id]) {
    viewers[id] = legacyViewer;
    await saveViewers(viewers);
  }
  const active = await loadActiveId();
  if (!active) await saveActiveId(id);

  // Remove the legacy entries so we only migrate once.
  await Promise.all([
    chrome.storage.sync.remove(TOKEN_STORAGE_KEY),
    chrome.storage.local.remove(VIEWER_STORAGE_KEY),
  ]);
}

// ---------- public API ----------

export interface AccountSummary {
  id: string;
  login: string;
  viewer: Viewer | null;
}

export async function listAccounts(): Promise<AccountSummary[]> {
  await migrateLegacy();
  const [accounts, viewers] = await Promise.all([loadAccounts(), loadViewers()]);
  return Object.values(accounts).map((a) => ({
    id: a.id,
    login: a.login,
    viewer: viewers[a.id] ?? null,
  }));
}

export async function getActiveAccountId(): Promise<string | null> {
  await migrateLegacy();
  return loadActiveId();
}

export async function setActiveAccountId(id: string | null): Promise<void> {
  await saveActiveId(id);
}

export async function getStoredAuth(): Promise<AuthState> {
  await migrateLegacy();
  const activeId = await loadActiveId();
  if (!activeId) return { token: null, viewer: null, accountId: null };

  const [accounts, viewers] = await Promise.all([loadAccounts(), loadViewers()]);
  const record = accounts[activeId];
  if (!record) {
    await saveActiveId(null);
    return { token: null, viewer: null, accountId: null };
  }
  try {
    const token = await decryptString(record.envelope);
    return { token, viewer: viewers[activeId] ?? null, accountId: activeId };
  } catch {
    // Key rotation or corruption — drop this account.
    await removeAccount(activeId);
    return { token: null, viewer: null, accountId: null };
  }
}

async function upsertAccount(token: string, viewer: Viewer): Promise<string> {
  const envelope = await encryptString(token);
  const accounts = await loadAccounts();
  const id = String(viewer.id);
  accounts[id] = { id, login: viewer.login, envelope };
  await saveAccounts(accounts);

  const viewers = await loadViewers();
  viewers[id] = viewer;
  await saveViewers(viewers);

  await saveActiveId(id);
  return id;
}

export async function signInWithToken(token: string): Promise<Viewer> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new GitHubApiError('Token is required', 0, 'other');
  }
  const viewer = await fetchViewer(trimmed);
  await upsertAccount(trimmed, viewer);
  return viewer;
}

export async function removeAccount(id: string): Promise<void> {
  const accounts = await loadAccounts();
  if (accounts[id]) {
    delete accounts[id];
    await saveAccounts(accounts);
  }
  const viewers = await loadViewers();
  if (viewers[id]) {
    delete viewers[id];
    await saveViewers(viewers);
  }
  const active = await loadActiveId();
  if (active === id) {
    const remaining = Object.keys(accounts);
    await saveActiveId(remaining[0] ?? null);
  }
}

export async function signOut(): Promise<void> {
  // Sign-out only removes the active account to keep other accounts intact.
  const active = await loadActiveId();
  if (active) {
    await removeAccount(active);
  }
  const remaining = await loadAccounts();
  if (Object.keys(remaining).length === 0) {
    // Fully logged out: purge the crypto key so sync residue can't be
    // decrypted from a backup.
    await clearCryptoKey();
  }
}

export async function clearStoredAuth(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.remove([ACCOUNTS_STORAGE_KEY, TOKEN_STORAGE_KEY]),
    chrome.storage.local.remove([
      VIEWERS_STORAGE_KEY,
      VIEWER_STORAGE_KEY,
      ACTIVE_ACCOUNT_STORAGE_KEY,
    ]),
    clearCryptoKey(),
  ]);
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
