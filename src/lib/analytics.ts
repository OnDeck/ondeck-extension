// Per-account weekly review counter, persisted in chrome.storage.local.

const STORAGE_KEY = 'gh_workflow_analytics_v1';

export interface AccountStats {
  total: number;
  lastReviewedAt: number | null;
  byWeek: Record<string, number>; // ISO week key → count
}

export interface AnalyticsBag {
  [accountId: string]: AccountStats;
}

function isoWeekKey(date: Date): string {
  // ISO-8601 week: Thursday-based. See https://en.wikipedia.org/wiki/ISO_week_date
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function currentWeekKey(): string {
  return isoWeekKey(new Date());
}

async function readBag(): Promise<AnalyticsBag> {
  const bag = await chrome.storage.local.get(STORAGE_KEY);
  return (bag[STORAGE_KEY] as AnalyticsBag | undefined) ?? {};
}

async function writeBag(bag: AnalyticsBag): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: bag });
}

function emptyStats(): AccountStats {
  return { total: 0, lastReviewedAt: null, byWeek: {} };
}

export async function getStats(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  return bag[accountId] ?? emptyStats();
}

export async function recordReview(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  const stats = bag[accountId] ?? emptyStats();
  const week = currentWeekKey();
  stats.byWeek[week] = (stats.byWeek[week] ?? 0) + 1;
  stats.total += 1;
  stats.lastReviewedAt = Date.now();
  bag[accountId] = stats;
  await writeBag(bag);
  return stats;
}

export function reviewsThisWeek(stats: AccountStats): number {
  return stats.byWeek[currentWeekKey()] ?? 0;
}
