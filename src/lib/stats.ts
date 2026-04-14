// Per-account persistent stats kept in chrome.storage.local.
//
// The only metric so far is a weekly review counter: every time the user
// uses the "Mark PR as reviewed" quick action we record a timestamp under
// the active account id. Reads return the count of events in the last
// rolling 7 days.

const STATS_STORAGE_KEY = 'gh_workflow_stats_v1';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EVENT_RETENTION_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

interface AccountStats {
  /** ISO timestamps of "reviewed" events, newest first. */
  reviews: string[];
}

interface StatsBag {
  byAccount: Record<number, AccountStats>;
}

async function loadBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STATS_STORAGE_KEY);
  const stored = bag[STATS_STORAGE_KEY] as StatsBag | undefined;
  return stored ?? { byAccount: {} };
}

async function saveBag(bag: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STATS_STORAGE_KEY]: bag });
}

function prune(stats: AccountStats, now: number): AccountStats {
  const cutoff = now - EVENT_RETENTION_MS;
  return {
    reviews: stats.reviews.filter((t) => {
      const ts = new Date(t).getTime();
      return !Number.isNaN(ts) && ts > cutoff;
    }),
  };
}

export async function recordReview(accountId: number): Promise<void> {
  const bag = await loadBag();
  const now = Date.now();
  const existing = prune(bag.byAccount[accountId] ?? { reviews: [] }, now);
  const next: AccountStats = {
    reviews: [new Date(now).toISOString(), ...existing.reviews],
  };
  await saveBag({
    byAccount: { ...bag.byAccount, [accountId]: next },
  });
}

export interface WeeklyStats {
  reviewsThisWeek: number;
  reviewsLastWeek: number;
}

export async function getWeeklyStats(accountId: number): Promise<WeeklyStats> {
  const bag = await loadBag();
  const now = Date.now();
  const stats = prune(bag.byAccount[accountId] ?? { reviews: [] }, now);
  const weekStart = now - WEEK_MS;
  const prevStart = now - 2 * WEEK_MS;
  let thisWeek = 0;
  let lastWeek = 0;
  for (const iso of stats.reviews) {
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) continue;
    if (ts > weekStart) thisWeek += 1;
    else if (ts > prevStart) lastWeek += 1;
  }
  return { reviewsThisWeek: thisWeek, reviewsLastWeek: lastWeek };
}

export async function clearAccountStats(accountId: number): Promise<void> {
  const bag = await loadBag();
  if (!(accountId in bag.byAccount)) return;
  const { [accountId]: _removed, ...rest } = bag.byAccount;
  void _removed;
  await saveBag({ byAccount: rest });
}
