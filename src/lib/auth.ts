import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';
import {
  addOrUpdateAccount,
  getActiveAccount,
  migrateLegacyAccount,
  removeAccount as removeStoredAccount,
} from './accounts';

export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1';
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1';

// OAuth client id must be provided at build time. Leaving it unset falls
// back to PAT-only mode. See README for how to register a GitHub OAuth app.
const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
}

interface StoredToken {
  envelope: Envelope;
}

export async function getStoredAuth(): Promise<AuthState> {
  await migrateLegacyAccount();
  const active = await getActiveAccount();
  if (active) {
    // Mirror into the legacy keys so the background service worker (which
    // still listens on those storage paths) keeps working.
    await mirrorLegacy(active.token, active.viewer);
    return active;
  }
  // Fallback: try the legacy single-slot directly.
  const [syncBag, localBag] = await Promise.all([
    chrome.storage.sync.get(TOKEN_STORAGE_KEY),
    chrome.storage.local.get(VIEWER_STORAGE_KEY),
  ]);
  const stored = syncBag[TOKEN_STORAGE_KEY] as StoredToken | undefined;
  const viewer = (localBag[VIEWER_STORAGE_KEY] as Viewer | undefined) ?? null;
  if (!stored?.envelope || !viewer) return { token: null, viewer: null };
  try {
    const token = await decryptString(stored.envelope);
    return { token, viewer };
  } catch {
    await clearStoredAuth();
    return { token: null, viewer: null };
  }
}

async function mirrorLegacy(token: string, viewer: Viewer): Promise<void> {
  const envelope = await encryptString(token);
  const payload: StoredToken = { envelope };
  await Promise.all([
    chrome.storage.sync.set({ [TOKEN_STORAGE_KEY]: payload }),
    chrome.storage.local.set({ [VIEWER_STORAGE_KEY]: viewer }),
  ]);
}

export async function saveToken(token: string, viewer: Viewer): Promise<void> {
  await addOrUpdateAccount(token, viewer);
  await mirrorLegacy(token, viewer);
}

export async function clearStoredAuth(): Promise<void> {
  // Remove only the active account; other accounts stay warm.
  const active = await getActiveAccount();
  if (active) {
    const fallback = await removeStoredAccount(active.viewer.login);
    if (fallback) {
      const next = await getActiveAccount();
      if (next) {
        await mirrorLegacy(next.token, next.viewer);
        return;
      }
    }
  }
  await Promise.all([
    chrome.storage.sync.remove(TOKEN_STORAGE_KEY),
    chrome.storage.local.remove(VIEWER_STORAGE_KEY),
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
  await clearStoredAuth();
}

// ---------- OAuth ----------

function buildRedirectUri(): string {
  // chrome.identity.getRedirectURL returns:
  //   https://<extension-id>.chromiumapp.org/
  return chrome.identity.getRedirectURL('oauth2');
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isOAuthConfigured(): boolean {
  return OAUTH_CLIENT_ID.length > 0;
}

/**
 * Launch the GitHub OAuth web flow. Requires a deployed token-exchange
 * endpoint because GitHub's OAuth app flow mandates exchanging the code
 * server-side (the client secret cannot live in the extension).
 *
 * Consumers must configure:
 *   - VITE_GITHUB_OAUTH_CLIENT_ID at build time
 *   - VITE_GITHUB_OAUTH_EXCHANGE_URL at build time — a URL that accepts
 *     { code, state, redirect_uri } and returns { access_token }.
 *
 * If either is missing this throws and the user should fall back to PAT.
 */
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
