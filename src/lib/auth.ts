import {
  addAccount,
  clearAllAccounts,
  getActiveAccount,
  getActiveToken,
  getActiveViewer,
  removeAccount,
  switchAccount,
} from './accounts';
import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { GitHubApiError, type Viewer } from './github-api';

// Legacy single-slot storage keys.  These continue to exist so that the
// background service worker's storage-change listener still fires on
// sign-in / sign-out (it watches TOKEN_STORAGE_KEY in `chrome.storage.sync`).
// They also provide a migration path for users upgrading from pre-multi-
// account builds.
export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1';
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1';

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
}

interface StoredLegacyToken {
  envelope: Envelope;
}

async function readLegacyAuth(): Promise<AuthState> {
  const [syncBag, localBag] = await Promise.all([
    chrome.storage.sync.get(TOKEN_STORAGE_KEY),
    chrome.storage.local.get(VIEWER_STORAGE_KEY),
  ]);
  const stored = syncBag[TOKEN_STORAGE_KEY] as StoredLegacyToken | undefined;
  const viewer = (localBag[VIEWER_STORAGE_KEY] as Viewer | undefined) ?? null;
  if (!stored?.envelope) return { token: null, viewer: null };
  try {
    const token = await decryptString(stored.envelope);
    return { token, viewer };
  } catch {
    return { token: null, viewer: null };
  }
}

async function writeLegacyAuth(token: string, viewer: Viewer): Promise<void> {
  const envelope = await encryptString(token);
  const payload: StoredLegacyToken = { envelope };
  await Promise.all([
    chrome.storage.sync.set({ [TOKEN_STORAGE_KEY]: payload }),
    chrome.storage.local.set({ [VIEWER_STORAGE_KEY]: viewer }),
  ]);
}

async function clearLegacyAuth(): Promise<void> {
  await Promise.all([
    chrome.storage.sync.remove(TOKEN_STORAGE_KEY),
    chrome.storage.local.remove(VIEWER_STORAGE_KEY),
  ]);
}

/**
 * Read the active account's token and viewer. Falls back to the legacy
 * single-slot storage if no accounts have been registered yet (migration
 * path for pre-multi-account builds).
 */
export async function getStoredAuth(): Promise<AuthState> {
  const active = await getActiveAccount();
  if (active) {
    try {
      const token = await decryptString(active.envelope);
      return { token, viewer: active.viewer };
    } catch {
      await clearAllAccounts();
    }
  }
  // Legacy fallback + one-shot migration.
  const legacy = await readLegacyAuth();
  if (legacy.token && legacy.viewer) {
    try {
      await addAccount(legacy.token);
    } catch {
      // Ignore; the legacy token may no longer be valid.
    }
  }
  return legacy;
}

/** Returns the decrypted token for the active account, or null. */
export async function getStoredToken(): Promise<string | null> {
  const token = await getActiveToken();
  if (token) return token;
  const legacy = await readLegacyAuth();
  return legacy.token;
}

export async function getStoredViewer(): Promise<Viewer | null> {
  const viewer = await getActiveViewer();
  if (viewer) return viewer;
  const legacy = await readLegacyAuth();
  return legacy.viewer;
}

/**
 * Sign in with a Personal Access Token. Persists the account in the
 * multi-account store, marks it active, and mirrors the token into the
 * legacy single-slot keys so existing listeners still fire.
 */
export async function signInWithToken(token: string): Promise<Viewer> {
  const viewer = await addAccount(token);
  // Mirror to legacy keys so the service worker's storage-change listener
  // still fires and so pre-multi-account consumers keep working.
  await writeLegacyAuth(token.trim(), viewer);
  return viewer;
}

/**
 * Sign out of the active account. Removes it from the account map; if other
 * accounts remain, the next one is promoted to active and its token is
 * mirrored to the legacy slot.
 */
export async function signOut(): Promise<void> {
  const active = await getActiveAccount();
  if (active) {
    const remaining = await removeAccount(active.login);
    const nextActive = remaining.find((a) => a.active);
    if (nextActive) {
      const nextToken = await getActiveToken();
      const nextViewer = await getActiveViewer();
      if (nextToken && nextViewer) {
        await writeLegacyAuth(nextToken, nextViewer);
        return;
      }
    }
  }
  await Promise.all([clearLegacyAuth(), clearCryptoKey()]);
}

/** Switch the active account and mirror its token into the legacy slot. */
export async function setActiveAccount(login: string): Promise<Viewer | null> {
  const viewer = await switchAccount(login);
  if (!viewer) return null;
  const token = await getActiveToken();
  if (token) await writeLegacyAuth(token, viewer);
  return viewer;
}

// OAuth client id must be provided at build time. Leaving it unset falls
// back to PAT-only mode. See README for how to register a GitHub OAuth app.
const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

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
