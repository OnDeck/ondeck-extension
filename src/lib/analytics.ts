// Lightweight persistent analytics stored in chrome.storage.local, keyed by
// account id so stats don't leak across accounts.

const STORAGE_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  reviewsByWeek: Record<string, number>; // ISO week key → count
  totalReviews: number;
  lastReviewAt: number | null;
}

interface StatsBag {
  [accountId: string]: AccountStats;
}

function emptyStats(): AccountStats {
  return { reviewsByWeek: {}, totalReviews: 0, lastReviewAt: null };
}

/**
 * ISO week key (YYYY-Www) for a given date. Weeks start on Monday.
 */
export function isoWeekKey(date: Date = new Date()): string {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function readBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STORAGE_KEY);
  return (bag[STORAGE_KEY] as StatsBag | undefined) ?? {};
}

async function writeBag(next: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export async function getStats(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  return bag[accountId] ?? emptyStats();
}

export async function recordReview(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  const existing = bag[accountId] ?? emptyStats();
  const week = isoWeekKey();
  const nextStats: AccountStats = {
    reviewsByWeek: {
      ...existing.reviewsByWeek,
      [week]: (existing.reviewsByWeek[week] ?? 0) + 1,
    },
    totalReviews: existing.totalReviews + 1,
    lastReviewAt: Date.now(),
  };
  bag[accountId] = nextStats;
  await writeBag(bag);
  return nextStats;
}

export async function resetStats(accountId: string): Promise<void> {
  const bag = await readBag();
  delete bag[accountId];
  await writeBag(bag);
}

export function reviewsThisWeek(stats: AccountStats): number {
  return stats.reviewsByWeek[isoWeekKey()] ?? 0;
}
