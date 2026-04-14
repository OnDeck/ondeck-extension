// Per-account weekly review counter. Stored in chrome.storage.local under
// a single key so we can read/write the entire bag in one round trip.

const KEY = 'gh_workflow_stats_v1';

interface StatsBag {
  [login: string]: { [isoWeek: string]: number };
}

function isoWeekKey(date = new Date()): string {
  // ISO 8601 week number, formatted YYYY-Www.
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7; // Mon=0
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // Thursday of current week
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function readBag(): Promise<StatsBag> {
  const bag = await chrome.storage.local.get(KEY);
  return (bag[KEY] as StatsBag | undefined) ?? {};
}

async function writeBag(bag: StatsBag): Promise<void> {
  await chrome.storage.local.set({ [KEY]: bag });
}

export async function incrementReviewCount(login: string): Promise<number> {
  const bag = await readBag();
  const week = isoWeekKey();
  const account = bag[login] ?? {};
  account[week] = (account[week] ?? 0) + 1;
  bag[login] = account;
  await writeBag(bag);
  return account[week];
}

export async function getReviewCount(login: string): Promise<number> {
  const bag = await readBag();
  const week = isoWeekKey();
  return bag[login]?.[week] ?? 0;
}
