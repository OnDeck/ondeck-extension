export const STATS_STORAGE_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  /** Map of ISO week key (YYYY-Www) -> count of PRs marked reviewed. */
  weeklyReviewed: Record<string, number>;
  /** Last updated ISO timestamp. */
  updatedAt: string;
}

type StatsMap = Record<string, AccountStats>;

/**
 * Compute the ISO-8601 week key (YYYY-Www) for a date. Weeks start on Monday.
 */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function readAll(): Promise<StatsMap> {
  const bag = await chrome.storage.local.get(STATS_STORAGE_KEY);
  return (bag[STATS_STORAGE_KEY] as StatsMap | undefined) ?? {};
}

async function writeAll(map: StatsMap): Promise<void> {
  await chrome.storage.local.set({ [STATS_STORAGE_KEY]: map });
}

export async function getStats(login: string): Promise<AccountStats> {
  const map = await readAll();
  return map[login] ?? { weeklyReviewed: {}, updatedAt: new Date().toISOString() };
}

export async function recordReview(login: string): Promise<AccountStats> {
  const map = await readAll();
  const current = map[login] ?? { weeklyReviewed: {}, updatedAt: new Date().toISOString() };
  const week = isoWeekKey();
  const next: AccountStats = {
    weeklyReviewed: {
      ...current.weeklyReviewed,
      [week]: (current.weeklyReviewed[week] ?? 0) + 1,
    },
    updatedAt: new Date().toISOString(),
  };
  map[login] = next;
  await writeAll(map);
  return next;
}

export function weeklyReviewCount(stats: AccountStats, now: Date = new Date()): number {
  return stats.weeklyReviewed[isoWeekKey(now)] ?? 0;
}
