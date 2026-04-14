// Weekly review analytics (ticket #11).
//
// Persists a per-account weekly review counter in chrome.storage.local.
// The week is anchored on Monday 00:00 local time; crossing that
// boundary resets the counter.

const STATS_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  weekStart: number; // epoch ms for the Monday of the current week
  reviewedCount: number;
}

export interface StatsBag {
  // Keyed by GitHub account id so each identity has its own counter.
  [accountId: string]: AccountStats;
}

function startOfWeek(d: Date): number {
  const copy = new Date(d);
  // Monday-as-start: map Sunday (0) to 7 so we subtract 6 days.
  const day = copy.getDay() || 7;
  if (day !== 1) copy.setDate(copy.getDate() - (day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

async function readBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STATS_KEY);
  return (bag[STATS_KEY] as StatsBag | undefined) ?? {};
}

async function writeBag(bag: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: bag });
}

export async function getWeeklyReviewCount(accountId: number): Promise<number> {
  const bag = await readBag();
  const entry = bag[String(accountId)];
  const week = startOfWeek(new Date());
  if (!entry || entry.weekStart !== week) return 0;
  return entry.reviewedCount;
}

export async function incrementWeeklyReviewCount(accountId: number): Promise<number> {
  const bag = await readBag();
  const week = startOfWeek(new Date());
  const existing = bag[String(accountId)];
  const next: AccountStats =
    existing && existing.weekStart === week
      ? { weekStart: week, reviewedCount: existing.reviewedCount + 1 }
      : { weekStart: week, reviewedCount: 1 };
  bag[String(accountId)] = next;
  await writeBag(bag);
  return next.reviewedCount;
}
