import {
  listAccounts,
  readActiveAccount,
  removeAccount as removeStoredAccount,
  upsertAccount,
} from './accounts';
import { clearCryptoKey } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

// Legacy keys kept for reference; the multi-account store migrates them
// automatically on first load. See ./accounts.ts.
export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1';
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1';

// OAuth client id must be provided at build time. Leaving it unset falls
// back to PAT-only mode. See README for how to register a GitHub OAuth app.
const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
}

export async function getStoredAuth(): Promise<AuthState> {
  return readActiveAccount();
}

export async function saveToken(token: string, viewer: Viewer): Promise<void> {
  await upsertAccount(token, viewer);
}

export async function clearStoredAuth(): Promise<void> {
  // Remove every account and drop the AES key. Used on full sign-out.
  const { accounts } = await listAccounts();
  for (const a of accounts) {
    await removeStoredAccount(a.login);
  }
  await clearCryptoKey();
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
  // Sign out the active account only. Other stored accounts remain so
  // the user can switch back without re-pasting their token. Full
  // wipeout is available via `clearStoredAuth`.
  const { active } = await listAccounts();
  if (active) await removeStoredAccount(active);
}

export async function signOutAll(): Promise<void> {
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
