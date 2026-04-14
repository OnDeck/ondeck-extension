// Multi-account storage manager.
//
// The original auth flow stores a single token + viewer pair. This module
// adds an isolated per-account record keyed by the GitHub user id, so the
// extension can switch between accounts without leaking tokens or stats
// between them. Each account holds:
//   - the encrypted token envelope (re-using the existing AES-GCM helper)
//   - the cached viewer profile
//   - persistent analytics counters (currently weekly review count)

import { decryptString, encryptString, type Envelope } from './crypto';
import { fetchViewer, type Viewer } from './github-api';

export const ACCOUNTS_STORAGE_KEY = 'gh_workflow_accounts_v1';

export interface AccountStats {
  // ISO date for the Monday that bounds the current rolling week. When the
  // current date passes the start of a new week, callers should reset
  // `reviews_this_week` and bump `week_start`.
  week_start: string;
  reviews_this_week: number;
  reviews_lifetime: number;
}

export interface AccountRecord {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  envelope: Envelope;
  stats: AccountStats;
}

interface AccountsBag {
  active_id: number | null;
  accounts: AccountRecord[];
}

const EMPTY_BAG: AccountsBag = { active_id: null, accounts: [] };

function freshStats(): AccountStats {
  return {
    week_start: startOfWeek(new Date()).toISOString(),
    reviews_this_week: 0,
    reviews_lifetime: 0,
  };
}

export function startOfWeek(date: Date): Date {
  // ISO week starts on Monday.
  const d = new Date(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function loadBag(): Promise<AccountsBag> {
  const stored = await chrome.storage.local.get(ACCOUNTS_STORAGE_KEY);
  return (stored[ACCOUNTS_STORAGE_KEY] as AccountsBag | undefined) ?? EMPTY_BAG;
}

async function saveBag(bag: AccountsBag): Promise<void> {
  await chrome.storage.local.set({ [ACCOUNTS_STORAGE_KEY]: bag });
}

export interface AccountSummary {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  active: boolean;
  stats: AccountStats;
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const bag = await loadBag();
  return bag.accounts.map((a) => ({
    id: a.id,
    login: a.login,
    name: a.name,
    avatar_url: a.avatar_url,
    active: a.id === bag.active_id,
    stats: a.stats,
  }));
}

export async function getActiveAccount(): Promise<AccountRecord | null> {
  const bag = await loadBag();
  if (bag.active_id == null) return bag.accounts[0] ?? null;
  return bag.accounts.find((a) => a.id === bag.active_id) ?? null;
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

/**
 * Verify a token, fetch the viewer, and add it as a new account (or update
 * an existing one). The new account is made active.
 */
export async function addAccount(token: string): Promise<AccountSummary> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('Token is required');
  const viewer = await fetchViewer(trimmed);
  const envelope = await encryptString(trimmed);
  const bag = await loadBag();
  const existing = bag.accounts.find((a) => a.id === viewer.id);
  const stats = existing?.stats ?? freshStats();
  const record: AccountRecord = {
    id: viewer.id,
    login: viewer.login,
    name: viewer.name,
    avatar_url: viewer.avatar_url,
    html_url: viewer.html_url,
    envelope,
    stats,
  };
  const accounts = existing
    ? bag.accounts.map((a) => (a.id === viewer.id ? record : a))
    : [...bag.accounts, record];
  await saveBag({ active_id: record.id, accounts });
  return {
    id: record.id,
    login: record.login,
    name: record.name,
    avatar_url: record.avatar_url,
    active: true,
    stats: record.stats,
  };
}

export async function switchAccount(id: number): Promise<void> {
  const bag = await loadBag();
  if (!bag.accounts.some((a) => a.id === id)) {
    throw new Error('Unknown account');
  }
  await saveBag({ ...bag, active_id: id });
}

export async function removeAccount(id: number): Promise<void> {
  const bag = await loadBag();
  const accounts = bag.accounts.filter((a) => a.id !== id);
  const active_id =
    bag.active_id === id ? (accounts[0]?.id ?? null) : bag.active_id;
  await saveBag({ active_id, accounts });
}

export function activeViewer(record: AccountRecord): Viewer {
  return {
    id: record.id,
    login: record.login,
    name: record.name,
    avatar_url: record.avatar_url,
    html_url: record.html_url,
  };
}

// ---------- Analytics ----------

function rollWeekIfNeeded(stats: AccountStats): AccountStats {
  const currentWeek = startOfWeek(new Date()).toISOString();
  if (stats.week_start === currentWeek) return stats;
  return {
    week_start: currentWeek,
    reviews_this_week: 0,
    reviews_lifetime: stats.reviews_lifetime,
  };
}

/**
 * Increment the active account's weekly + lifetime review counter. Safe to
 * call from any surface that observes a "review submitted" event.
 */
export async function recordReview(): Promise<AccountStats | null> {
  const bag = await loadBag();
  const account = bag.accounts.find((a) => a.id === bag.active_id);
  if (!account) return null;
  const rolled = rollWeekIfNeeded(account.stats);
  const next: AccountStats = {
    ...rolled,
    reviews_this_week: rolled.reviews_this_week + 1,
    reviews_lifetime: rolled.reviews_lifetime + 1,
  };
  const accounts = bag.accounts.map((a) =>
    a.id === account.id ? { ...a, stats: next } : a,
  );
  await saveBag({ ...bag, accounts });
  return next;
}

export async function getActiveStats(): Promise<AccountStats | null> {
  const account = await getActiveAccount();
  if (!account) return null;
  return rollWeekIfNeeded(account.stats);
}
