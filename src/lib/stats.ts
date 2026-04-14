// Per-account productivity analytics persisted in chrome.storage.local.
//
// Currently tracks the timestamps of reviews submitted through the extension
// so the dashboard can show "You've reviewed N PRs this week" for the active
// account.

const STATS_KEY = 'gh_workflow_stats_v1';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface AccountStats {
  reviewTimestamps: number[];
}

type StatsBag = Record<string, AccountStats>;

async function readAll(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(STATS_KEY);
  return (bag[STATS_KEY] as StatsBag | undefined) ?? {};
}

async function writeAll(next: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: next });
}

function pruneOld(timestamps: number[], now: number = Date.now()): number[] {
  const cutoff = now - 4 * WEEK_MS;
  return timestamps.filter((ts) => ts >= cutoff);
}

export async function recordReviewSubmitted(accountId: number | null): Promise<void> {
  if (accountId === null) return;
  const bag = await readAll();
  const existing = bag[accountId]?.reviewTimestamps ?? [];
  const next = pruneOld([...existing, Date.now()]);
  bag[accountId] = { reviewTimestamps: next };
  await writeAll(bag);
}

export async function getWeeklyReviewCount(
  accountId: number | null,
  now: number = Date.now(),
): Promise<number> {
  if (accountId === null) return 0;
  const bag = await readAll();
  const timestamps = bag[accountId]?.reviewTimestamps ?? [];
  const cutoff = now - WEEK_MS;
  return timestamps.filter((ts) => ts >= cutoff).length;
}

export async function clearStatsForAccount(accountId: number): Promise<void> {
  const bag = await readAll();
  delete bag[accountId];
  await writeAll(bag);
}
