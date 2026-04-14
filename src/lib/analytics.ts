export const STATS_STORAGE_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  // Count of PRs the user has "Marked reviewed" via the popup quick action,
  // bucketed by ISO week key like "2026-W15".
  weeklyReviews: Record<string, number>;
  totalReviews: number;
  lastReviewAt: string | null;
}

type StatsBag = Record<string, AccountStats>;

export function emptyStats(): AccountStats {
  return { weeklyReviews: {}, totalReviews: 0, lastReviewAt: null };
}

export function isoWeekKey(d: Date = new Date()): string {
  // ISO 8601 week: week 1 contains the first Thursday of the year.
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function loadBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STATS_STORAGE_KEY);
  return (bag[STATS_STORAGE_KEY] as StatsBag | undefined) ?? {};
}

async function saveBag(bag: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STATS_STORAGE_KEY]: bag });
}

export async function getAccountStats(accountId: string): Promise<AccountStats> {
  const bag = await loadBag();
  return bag[accountId] ?? emptyStats();
}

export async function incrementReviewed(accountId: string): Promise<AccountStats> {
  const bag = await loadBag();
  const current = bag[accountId] ?? emptyStats();
  const week = isoWeekKey();
  const next: AccountStats = {
    weeklyReviews: { ...current.weeklyReviews, [week]: (current.weeklyReviews[week] ?? 0) + 1 },
    totalReviews: current.totalReviews + 1,
    lastReviewAt: new Date().toISOString(),
  };
  bag[accountId] = next;
  await saveBag(bag);
  return next;
}

export function weeklyCount(stats: AccountStats): number {
  return stats.weeklyReviews[isoWeekKey()] ?? 0;
}
