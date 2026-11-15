import { clearCryptoKey, decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';
import { NOTIFICATIONS_CACHE_KEY, NOTIFICATION_SEEN_CACHE_KEY } from '../shared/constants';

export const TOKEN_STORAGE_KEY = 'gh_workflow_token_v1';
export const VIEWER_STORAGE_KEY = 'gh_workflow_viewer_v1';

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
    // The notification cache is the signed-in user's inbox; never show it to the next account.
    chrome.storage.local.remove([
      TOKEN_STORAGE_KEY,
      VIEWER_STORAGE_KEY,
      NOTIFICATIONS_CACHE_KEY,
      NOTIFICATION_SEEN_CACHE_KEY,
    ]),
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
