// Per-account weekly analytics, persisted in chrome.storage.local.
// Scoped by GitHub login so switching accounts reads a different counter.

const STATS_KEY = 'gh_workflow_stats_v1';

interface WeekBucket {
  reviewed: number;
}

interface AccountStats {
  weeks: Record<string, WeekBucket>;
}

interface StatsState {
  byAccount: Record<string, AccountStats>;
}

// ISO week key like "2026-W15". Computed in UTC so the bucket is
// consistent across devices / time zones.
export function isoWeekKey(date: Date = new Date()): string {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function read(): Promise<StatsState> {
  const bag = await chrome.storage.local.get(STATS_KEY);
  const state = bag[STATS_KEY] as StatsState | undefined;
  return { byAccount: state?.byAccount ?? {} };
}

async function write(state: StatsState): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: state });
}

export async function recordReview(login: string, when: Date = new Date()): Promise<void> {
  const state = await read();
  const week = isoWeekKey(when);
  const acct = state.byAccount[login] ?? { weeks: {} };
  const bucket = acct.weeks[week] ?? { reviewed: 0 };
  acct.weeks[week] = { reviewed: bucket.reviewed + 1 };
  state.byAccount[login] = acct;
  await write(state);
}

export interface WeeklyStats {
  login: string;
  week: string;
  reviewed: number;
}

export async function getWeeklyStats(login: string, when: Date = new Date()): Promise<WeeklyStats> {
  const state = await read();
  const week = isoWeekKey(when);
  const reviewed = state.byAccount[login]?.weeks[week]?.reviewed ?? 0;
  return { login, week, reviewed };
}

export async function clearStatsForAccount(login: string): Promise<void> {
  const state = await read();
  delete state.byAccount[login];
  await write(state);
}
