import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, GitHubApiError, type Viewer } from './github-api';

export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v1';
export const ACTIVE_LOGIN_STORAGE_KEY = 'gh_workflow_active_login_v1';

export interface StoredAccount {
  login: string;
  viewer: Viewer;
  envelope: Envelope;
}

interface StoredAccountsMap {
  [login: string]: StoredAccount;
}

export interface AccountSummary {
  login: string;
  name: string | null;
  avatar_url: string;
  active: boolean;
}

async function readAccounts(): Promise<StoredAccountsMap> {
  const bag = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
  return (bag[ACCOUNTS_STORAGE_KEY] as StoredAccountsMap | undefined) ?? {};
}

async function writeAccounts(accounts: StoredAccountsMap): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: accounts });
}

async function readActiveLogin(): Promise<string | null> {
  const bag = await chrome.storage.local.get(ACTIVE_LOGIN_STORAGE_KEY);
  return (bag[ACTIVE_LOGIN_STORAGE_KEY] as string | undefined) ?? null;
}

async function writeActiveLogin(login: string | null): Promise<void> {
  if (login === null) {
    await chrome.storage.local.remove(ACTIVE_LOGIN_STORAGE_KEY);
  } else {
    await chrome.storage.local.set({ [ACTIVE_LOGIN_STORAGE_KEY]: login });
  }
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const [accounts, active] = await Promise.all([readAccounts(), readActiveLogin()]);
  return Object.values(accounts).map((account) => ({
    login: account.login,
    name: account.viewer.name,
    avatar_url: account.viewer.avatar_url,
    active: account.login === active,
  }));
}

export async function getActiveAccount(): Promise<StoredAccount | null> {
  const [accounts, active] = await Promise.all([readAccounts(), readActiveLogin()]);
  if (!active) return null;
  return accounts[active] ?? null;
}

export async function getActiveToken(): Promise<string | null> {
  const account = await getActiveAccount();
  if (!account) return null;
  try {
    return await decryptString(account.envelope);
  } catch {
    return null;
  }
}

export async function getActiveViewer(): Promise<Viewer | null> {
  const account = await getActiveAccount();
  return account?.viewer ?? null;
}

export async function addAccount(token: string): Promise<Viewer> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new GitHubApiError('Token is required', 0, 'other');
  }
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const accounts = await readAccounts();
  accounts[viewer.login] = { login: viewer.login, viewer, envelope };
  await writeAccounts(accounts);
  await writeActiveLogin(viewer.login);
  return viewer;
}

export async function removeAccount(login: string): Promise<AccountSummary[]> {
  const accounts = await readAccounts();
  delete accounts[login];
  await writeAccounts(accounts);
  const active = await readActiveLogin();
  if (active === login) {
    const next = Object.keys(accounts)[0] ?? null;
    await writeActiveLogin(next);
  }
  return listAccounts();
}

export async function switchAccount(login: string): Promise<Viewer | null> {
  const accounts = await readAccounts();
  if (!accounts[login]) return null;
  await writeActiveLogin(login);
  return accounts[login].viewer;
}

export async function clearAllAccounts(): Promise<void> {
  await Promise.all([
    chrome.storage.local.remove(ACCOUNTS_STORAGE_KEY),
    chrome.storage.local.remove(ACTIVE_LOGIN_STORAGE_KEY),
  ]);
}
