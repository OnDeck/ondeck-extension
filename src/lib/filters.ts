// Generic client-side filtering helpers shared by the per-tab list views.

export interface FilterableItem {
  repo?: string;
  org?: string;
  labels?: { name: string }[];
  updated_at?: string;
}

export interface FilterState {
  repo: string | null;
  label: string | null;
  range: DateRange;
}

export type DateRange = 'any' | 'today' | 'week' | 'month';

export const DEFAULT_FILTERS: FilterState = {
  repo: null,
  label: null,
  range: 'any',
};

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const RANGE_MS: Record<Exclude<DateRange, 'any'>, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export function applyFilters<T extends FilterableItem>(
  items: T[],
  state: FilterState,
): T[] {
  return items.filter((item) => matches(item, state));
}

function matches(item: FilterableItem, state: FilterState): boolean {
  if (state.repo) {
    const repoKey = item.org && item.repo ? `${item.org}/${item.repo}` : item.repo ?? '';
    if (repoKey !== state.repo) return false;
  }
  if (state.label) {
    if (!item.labels?.some((l) => l.name === state.label)) return false;
  }
  if (state.range !== 'any' && item.updated_at) {
    const window = RANGE_MS[state.range];
    const updated = new Date(item.updated_at).getTime();
    if (Number.isNaN(updated) || Date.now() - updated > window) return false;
  }
  return true;
}

export function uniqueRepos<T extends FilterableItem>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const key = item.org && item.repo ? `${item.org}/${item.repo}` : item.repo;
    if (key) set.add(key);
  }
  return Array.from(set).sort();
}

export function uniqueLabels<T extends FilterableItem>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const label of item.labels ?? []) set.add(label.name);
  }
  return Array.from(set).sort();
}
