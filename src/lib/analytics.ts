// Per-account review analytics persisted in chrome.storage.local.
// Reviews are bucketed by ISO week so we can answer
// "You've reviewed N PRs this week" without scanning raw history.

const STATS_STORAGE_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  weeks: Record<string, number>;
  lifetime: number;
}

type StatsBag = Record<string, AccountStats>;

function isoWeekKey(date: Date = new Date()): string {
  // ISO 8601 week-numbering year + week number.
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function readBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STATS_STORAGE_KEY);
  return (bag[STATS_STORAGE_KEY] as StatsBag | undefined) ?? {};
}

async function writeBag(bag: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STATS_STORAGE_KEY]: bag });
}

export async function recordReview(accountId: number): Promise<void> {
  const bag = await readBag();
  const key = String(accountId);
  const stats = bag[key] ?? { weeks: {}, lifetime: 0 };
  const week = isoWeekKey();
  stats.weeks[week] = (stats.weeks[week] ?? 0) + 1;
  stats.lifetime += 1;
  bag[key] = stats;
  await writeBag(bag);
}

export async function getStats(accountId: number): Promise<AccountStats> {
  const bag = await readBag();
  return bag[String(accountId)] ?? { weeks: {}, lifetime: 0 };
}

export async function reviewsThisWeek(accountId: number): Promise<number> {
  const stats = await getStats(accountId);
  return stats.weeks[isoWeekKey()] ?? 0;
}

export async function clearStats(accountId?: number): Promise<void> {
  if (accountId === undefined) {
    await chrome.storage.local.remove(STATS_STORAGE_KEY);
    return;
  }
  const bag = await readBag();
  delete bag[String(accountId)];
  await writeBag(bag);
}
