// Per-account analytics. Everything is keyed by accountId so multi-account
// users see stats for the active account only.

const STATS_STORAGE_KEY = 'gh_workflow_stats_v1';

export interface WeekBucket {
  reviews: number;
}

export interface AccountStats {
  weeks: Record<string, WeekBucket>;
}

export type StatsMap = Record<string, AccountStats>;

/**
 * Returns an ISO-8601 week identifier like `2026-W15`. Matches the week
 * grouping GitHub uses for contribution graphs.
 */
export function isoWeek(date: Date = new Date()): string {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function loadStats(): Promise<StatsMap> {
  const bag = await chrome.storage.local.get(STATS_STORAGE_KEY);
  return (bag[STATS_STORAGE_KEY] as StatsMap | undefined) ?? {};
}

async function saveStats(stats: StatsMap): Promise<void> {
  await chrome.storage.local.set({ [STATS_STORAGE_KEY]: stats });
}

export async function incrementReviewCount(accountId: string): Promise<number> {
  const stats = await loadStats();
  const week = isoWeek();
  const account = stats[accountId] ?? { weeks: {} };
  const bucket = account.weeks[week] ?? { reviews: 0 };
  bucket.reviews += 1;
  account.weeks[week] = bucket;
  stats[accountId] = account;
  await saveStats(stats);
  return bucket.reviews;
}

export async function getWeeklyReviewCount(accountId: string): Promise<number> {
  const stats = await loadStats();
  const week = isoWeek();
  return stats[accountId]?.weeks[week]?.reviews ?? 0;
}

export function subscribeStats(listener: () => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local' && changes[STATS_STORAGE_KEY]) listener();
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
