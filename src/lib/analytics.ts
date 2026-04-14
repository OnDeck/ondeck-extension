// Persistent review analytics. Per account, we track:
//   - total reviews (incremented any time submitPrReview succeeds)
//   - week buckets: [{ weekStartIso, count }, ...] (keeps the latest 12
//     weeks so we can show a 7-day rolling "reviewed N PRs this week"
//     figure without unbounded growth).

export const ANALYTICS_STORAGE_KEY = 'gh_workflow_analytics_v1';

export interface WeekBucket {
  weekStartIso: string;
  count: number;
}

export interface AccountStats {
  total: number;
  weeks: WeekBucket[];
}

type AnalyticsBag = Record<string, AccountStats>;

async function readBag(): Promise<AnalyticsBag> {
  const bag = await chrome.storage.local.get(ANALYTICS_STORAGE_KEY);
  return (bag[ANALYTICS_STORAGE_KEY] as AnalyticsBag | undefined) ?? {};
}

async function writeBag(next: AnalyticsBag): Promise<void> {
  await chrome.storage.local.set({ [ANALYTICS_STORAGE_KEY]: next });
}

/**
 * Return the ISO date (yyyy-mm-dd) of Monday in the same week as
 * `date`. Using Monday matches GitHub's own weekly contribution graph.
 */
export function weekStart(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function getStatsFor(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  return bag[accountId] ?? { total: 0, weeks: [] };
}

/**
 * Record a review event for the given account. We bump the total and
 * either append to or increment the current week bucket. Buckets
 * older than 12 weeks are trimmed.
 */
export async function recordReview(accountId: string): Promise<AccountStats> {
  const bag = await readBag();
  const current = bag[accountId] ?? { total: 0, weeks: [] };
  const thisWeek = weekStart();
  const existing = current.weeks.find((w) => w.weekStartIso === thisWeek);
  const nextWeeks = existing
    ? current.weeks.map((w) =>
        w.weekStartIso === thisWeek ? { ...w, count: w.count + 1 } : w,
      )
    : [...current.weeks, { weekStartIso: thisWeek, count: 1 }];
  // Sort desc and cap at 12 weeks.
  nextWeeks.sort((a, b) => (a.weekStartIso < b.weekStartIso ? 1 : -1));
  const trimmed = nextWeeks.slice(0, 12);
  const updated: AccountStats = { total: current.total + 1, weeks: trimmed };
  bag[accountId] = updated;
  await writeBag(bag);
  return updated;
}

export function reviewsThisWeek(stats: AccountStats): number {
  const thisWeek = weekStart();
  return stats.weeks.find((w) => w.weekStartIso === thisWeek)?.count ?? 0;
}
