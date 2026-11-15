import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';
import { NOTIFICATION_SEEN_CACHE_KEY } from '../shared/constants';

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
  const bag = await chrome.storage.local.get([TOKEN_STORAGE_KEY, VIEWER_STORAGE_KEY]);
  const viewer = (bag[VIEWER_STORAGE_KEY] as Viewer | undefined) ?? null;
  const stored = bag[TOKEN_STORAGE_KEY] as StoredToken | undefined;
  if (!stored?.envelope) return migrateLegacySyncToken(viewer);
  try {
    const token = await decryptString(stored.envelope);
    return { token, viewer };
  } catch {
    // Key rotation or corruption — treat as logged out.
    await clearStoredAuth();
    return { token: null, viewer: null };
  }
}

// Earlier builds wrote the envelope to chrome.storage.sync while the key stayed
// in chrome.storage.local. A second Chrome profile then received an envelope it
// could never decrypt, and its failure path wiped the token for every device.
async function migrateLegacySyncToken(viewer: Viewer | null): Promise<AuthState> {
  const syncBag = await chrome.storage.sync.get(TOKEN_STORAGE_KEY);
  const legacy = syncBag[TOKEN_STORAGE_KEY] as StoredToken | undefined;
  if (!legacy?.envelope || !viewer) return { token: null, viewer: null };
  try {
    const token = await decryptString(legacy.envelope);
    await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: legacy });
    await chrome.storage.sync.remove(TOKEN_STORAGE_KEY);
    return { token, viewer };
  } catch {
    // Encrypted on another device — leave it for that device to migrate.
    return { token: null, viewer: null };
  }
}

export async function saveToken(token: string, viewer: Viewer): Promise<void> {
  const envelope = await encryptString(token);
  const payload: StoredToken = { envelope };
  await chrome.storage.local.set({
    [TOKEN_STORAGE_KEY]: payload,
    [VIEWER_STORAGE_KEY]: viewer,
  });
}

export async function clearStoredAuth(): Promise<void> {
  await Promise.all([
    chrome.storage.local.remove([TOKEN_STORAGE_KEY, VIEWER_STORAGE_KEY, NOTIFICATION_SEEN_CACHE_KEY]),
    chrome.storage.sync.remove(TOKEN_STORAGE_KEY),
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
