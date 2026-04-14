// Weekly analytics stored per-account in chrome.storage.local. Each entry is
// keyed by the ISO date of the Monday that starts the week so we can expose
// a rolling "this week" counter without needing to prune aggressively.

export const STATS_STORAGE_KEY = 'gh_workflow_stats_v1';

export interface WeeklyStats {
  reviewsByWeek: Record<string, number>;
}

export interface AllAccountStats {
  [accountId: string]: WeeklyStats;
}

function mondayOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  // Sunday = 0 in JS; treat Monday as week start.
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function currentWeekKey(date: Date = new Date()): string {
  return mondayOfWeek(date).toISOString().slice(0, 10);
}

async function loadAll(): Promise<AllAccountStats> {
  const bag = await chrome.storage.local.get(STATS_STORAGE_KEY);
  return (bag[STATS_STORAGE_KEY] as AllAccountStats | undefined) ?? {};
}

async function saveAll(stats: AllAccountStats): Promise<void> {
  await chrome.storage.local.set({ [STATS_STORAGE_KEY]: stats });
}

export async function getReviewsThisWeek(accountId: string | null): Promise<number> {
  if (!accountId) return 0;
  const all = await loadAll();
  const accountStats = all[accountId];
  if (!accountStats) return 0;
  return accountStats.reviewsByWeek[currentWeekKey()] ?? 0;
}

export async function incrementReviews(accountId: string | null): Promise<number> {
  if (!accountId) return 0;
  const all = await loadAll();
  const accountStats = all[accountId] ?? { reviewsByWeek: {} };
  const key = currentWeekKey();
  accountStats.reviewsByWeek[key] = (accountStats.reviewsByWeek[key] ?? 0) + 1;
  all[accountId] = accountStats;
  await saveAll(all);
  return accountStats.reviewsByWeek[key];
}

export async function resetStats(accountId: string | null): Promise<void> {
  if (!accountId) return;
  const all = await loadAll();
  delete all[accountId];
  await saveAll(all);
}
