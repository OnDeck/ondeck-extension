// Per-account analytics persisted in chrome.storage.local.
//
// We track the rolling weekly review counter ("You've reviewed N PRs this
// week") plus a longer-tail per-day history so we can render trends in
// future tickets without re-fetching anything from GitHub.
//
// Storage layout:
//   gh_workflow_stats_v1 -> Record<accountId, AccountStats>

const STATS_KEY = 'gh_workflow_stats_v1';

export interface DayBucket {
  date: string; // YYYY-MM-DD in the user's local timezone
  reviews: number;
}

export interface AccountStats {
  reviewedIds: string[]; // PR / review ids we've already counted
  history: DayBucket[]; // newest-first, capped to 90 entries
}

type StatsMap = Record<string, AccountStats>;

const EMPTY_STATS: AccountStats = { reviewedIds: [], history: [] };

async function readMap(): Promise<StatsMap> {
  const bag = await chrome.storage.local.get(STATS_KEY);
  return (bag[STATS_KEY] as StatsMap | undefined) ?? {};
}

async function writeMap(map: StatsMap): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: map });
}

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function getStats(accountId: string): Promise<AccountStats> {
  const map = await readMap();
  return map[accountId] ?? { ...EMPTY_STATS };
}

/**
 * Record a freshly-completed review. Returns the updated weekly count so
 * the UI can flash a new total without re-reading the store.
 *
 * Calls are idempotent per `reviewId` so accidentally double-clicking the
 * "mark reviewed" action does not inflate the counter.
 */
export async function recordReview(
  accountId: string,
  reviewId: string,
): Promise<AccountStats> {
  const map = await readMap();
  const current: AccountStats = map[accountId] ?? { ...EMPTY_STATS };
  if (current.reviewedIds.includes(reviewId)) return current;

  const today = todayKey();
  const history = [...current.history];
  const todayIdx = history.findIndex((b) => b.date === today);
  if (todayIdx >= 0) {
    history[todayIdx] = {
      date: today,
      reviews: history[todayIdx].reviews + 1,
    };
  } else {
    history.unshift({ date: today, reviews: 1 });
  }
  // Keep the last 90 daily buckets so the popup never reads an unbounded
  // payload out of chrome.storage.
  const trimmedHistory = history.slice(0, 90);
  const reviewedIds = [...current.reviewedIds, reviewId].slice(-500);

  const next: AccountStats = { reviewedIds, history: trimmedHistory };
  map[accountId] = next;
  await writeMap(map);
  return next;
}

export function reviewsThisWeek(stats: AccountStats): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let total = 0;
  for (const bucket of stats.history) {
    const bucketTime = new Date(`${bucket.date}T00:00:00`).getTime();
    if (Number.isNaN(bucketTime) || bucketTime < cutoff) continue;
    total += bucket.reviews;
  }
  return total;
}

export async function clearStats(accountId: string): Promise<void> {
  const map = await readMap();
  delete map[accountId];
  await writeMap(map);
}
