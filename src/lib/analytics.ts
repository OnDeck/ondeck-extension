// Per-account weekly analytics, persisted to chrome.storage.local.
// Tracks PR review counts in ISO-week buckets so the popup can surface
// "You've reviewed N PRs this week".

export const STATS_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  accountId: string;
  /** Map of ISO-week key (e.g. "2026-W15") -> review count. */
  weeklyReviews: Record<string, number>;
  /** Total reviews across all weeks since stats began. */
  lifetimeReviews: number;
}

interface StatsBag {
  [accountId: string]: AccountStats;
}

export function isoWeekKey(date = new Date()): string {
  // ISO week: Thursday of the current week determines the year.
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

async function readBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STATS_KEY);
  return (bag[STATS_KEY] as StatsBag | undefined) ?? {};
}

async function writeBag(bag: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: bag });
}

export async function getStats(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  return (
    bag[accountId] ?? {
      accountId,
      weeklyReviews: {},
      lifetimeReviews: 0,
    }
  );
}

export async function recordReview(accountId: string, when = new Date()): Promise<AccountStats> {
  const bag = await readBag();
  const week = isoWeekKey(when);
  const current = bag[accountId] ?? {
    accountId,
    weeklyReviews: {},
    lifetimeReviews: 0,
  };
  current.weeklyReviews[week] = (current.weeklyReviews[week] ?? 0) + 1;
  current.lifetimeReviews += 1;
  bag[accountId] = current;
  await writeBag(bag);
  return current;
}

export async function reviewsThisWeek(accountId: string): Promise<number> {
  const stats = await getStats(accountId);
  return stats.weeklyReviews[isoWeekKey()] ?? 0;
}

export async function clearStats(accountId: string): Promise<void> {
  const bag = await readBag();
  delete bag[accountId];
  await writeBag(bag);
}
