import {
  addAccountWithToken,
  getActiveAccount,
  listAccounts,
  migrateV1IfNeeded,
  removeAccount,
  setActiveAccount,
  type AccountSummary,
} from './accounts';
import { clearCryptoKey } from './crypto';
import { GitHubApiError, type Viewer } from './github-api';

export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1';
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1';

// OAuth client id must be provided at build time. Leaving it unset falls
// back to PAT-only mode. See README for how to register a GitHub OAuth app.
const OAUTH_CLIENT_ID = (import.meta.env?.VITE_GITHUB_OAUTH_CLIENT_ID ?? '') as string;

export interface AuthState {
  token: string | null;
  viewer: Viewer | null;
  accountId: string | null;
}

/**
 * Return the currently-active account as an AuthState shape. This is
 * the function the popup + service worker read on every load.
 */
export async function getStoredAuth(): Promise<AuthState> {
  await migrateV1IfNeeded();
  const active = await getActiveAccount();
  if (!active) return { token: null, viewer: null, accountId: null };
  return { token: active.token, viewer: active.viewer, accountId: active.id };
}

export async function getAllAccounts(): Promise<AccountSummary[]> {
  return listAccounts();
}

export async function switchActiveAccount(id: string): Promise<void> {
  await setActiveAccount(id);
}

export async function forgetAccount(id: string): Promise<void> {
  await removeAccount(id);
}

/**
 * Verify a token with GitHub, persist it (encrypted) into the
 * multi-account store, and make it active.
 */
export async function signInWithToken(token: string): Promise<Viewer> {
  const { viewer } = await addAccountWithToken(token);
  return viewer;
}

export async function clearStoredAuth(): Promise<void> {
  // Remove every account we know about. clearCryptoKey is already
  // called by removeAccount when the last account is gone.
  const accounts = await listAccounts();
  for (const account of accounts) {
    await removeAccount(account.id);
  }
  await clearCryptoKey();
}

export async function signOut(): Promise<void> {
  await clearStoredAuth();
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

/**
 * Launch the GitHub OAuth web flow. Requires a deployed token-exchange
 * endpoint because GitHub's OAuth app flow mandates exchanging the code
 * server-side (the client secret cannot live in the extension).
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
