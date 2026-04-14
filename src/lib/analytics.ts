// Persistent per-account analytics: weekly review counter and lifetime
// totals. Scoped by account id so multi-account users see isolated stats.
//
// Storage layout (chrome.storage.local):
//   gh_workflow_stats_v1: {
//     [accountId]: {
//       lifetimeReviewed: number;
//       // Map of ISO week key (e.g. "2026-W15") -> count.
//       perWeek: Record<string, number>;
//     }
//   }

const STATS_KEY = 'gh_workflow_stats_v1';

export interface AccountStats {
  lifetimeReviewed: number;
  perWeek: Record<string, number>;
}

type StatsMap = Record<string, AccountStats>;

function emptyStats(): AccountStats {
  return { lifetimeReviewed: 0, perWeek: {} };
}

/**
 * Returns an ISO week key: "YYYY-Www". Week 1 is the week containing the
 * first Thursday of the year (ISO 8601), matching GitHub activity graphs.
 */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function readStats(): Promise<StatsMap> {
  const bag = await chrome.storage.local.get(STATS_KEY);
  return (bag[STATS_KEY] as StatsMap | undefined) ?? {};
}

async function writeStats(stats: StatsMap): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

export async function recordReview(accountId: string, when: Date = new Date()): Promise<void> {
  const stats = await readStats();
  const current = stats[accountId] ?? emptyStats();
  const weekKey = isoWeekKey(when);
  current.lifetimeReviewed += 1;
  current.perWeek[weekKey] = (current.perWeek[weekKey] ?? 0) + 1;
  stats[accountId] = current;
  await writeStats(stats);
}

export async function getAccountStats(accountId: string): Promise<AccountStats> {
  const stats = await readStats();
  return stats[accountId] ?? emptyStats();
}

export async function getReviewsThisWeek(accountId: string): Promise<number> {
  const stats = await getAccountStats(accountId);
  return stats.perWeek[isoWeekKey()] ?? 0;
}

export async function resetAccountStats(accountId: string): Promise<void> {
  const stats = await readStats();
  delete stats[accountId];
  await writeStats(stats);
}
