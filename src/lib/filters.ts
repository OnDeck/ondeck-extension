// Pure helpers for filtering issue/PR-shaped items in the popup.
//
// The Quick Actions ticket introduces a shared filter bar for the various
// list tabs. Each tab passes its items through `applyFilters` with the
// user's current selections so the filter logic stays in one place and is
// easy to unit test.

export interface FilterableItem {
  repository_url?: string;
  repository?: { full_name: string };
  labels?: { name: string }[];
  updated_at: string;
}

export type DateRange = 'any' | 'today' | 'week' | 'month';

export interface FilterState {
  repo: string | null;
  label: string | null;
  range: DateRange;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  repo: null,
  label: null,
  range: 'any',
};

export function repoSlug(item: FilterableItem): string | null {
  if (item.repository?.full_name) return item.repository.full_name;
  if (!item.repository_url) return null;
  const match = item.repository_url.match(/repos\/([^/]+\/[^/]+)$/);
  return match ? match[1] : null;
}

const RANGE_MS: Record<Exclude<DateRange, 'any'>, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export function withinRange(item: FilterableItem, range: DateRange): boolean {
  if (range === 'any') return true;
  const ts = new Date(item.updated_at).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= RANGE_MS[range];
}

export function applyFilters<T extends FilterableItem>(
  items: T[],
  state: FilterState,
): T[] {
  return items.filter((item) => {
    if (state.repo) {
      const slug = repoSlug(item);
      if (slug !== state.repo) return false;
    }
    if (state.label) {
      const labels = item.labels ?? [];
      if (!labels.some((l) => l.name === state.label)) return false;
    }
    if (!withinRange(item, state.range)) return false;
    return true;
  });
}

export function uniqueRepos<T extends FilterableItem>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const slug = repoSlug(item);
    if (slug) set.add(slug);
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
