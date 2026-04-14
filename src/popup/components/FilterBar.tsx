import { useMemo } from 'react';
import { repoSlugFromUrl, type SearchIssueItem } from '../../lib/github-api';

export type DateRange = 'all' | 'today' | 'week' | 'month';

export interface FilterState {
  repo: string; // '' means all
  label: string; // '' means all
  range: DateRange;
}

export const EMPTY_FILTER: FilterState = { repo: '', label: '', range: 'all' };

interface Props {
  items: SearchIssueItem[];
  state: FilterState;
  onChange: (next: FilterState) => void;
}

function within(range: DateRange, iso: string): boolean {
  if (range === 'all') return true;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today':
      return now - then < day;
    case 'week':
      return now - then < 7 * day;
    case 'month':
      return now - then < 30 * day;
  }
}

export function applyFilter(
  items: SearchIssueItem[],
  state: FilterState,
): SearchIssueItem[] {
  return items.filter((item) => {
    if (state.repo && repoSlugFromUrl(item.repository_url) !== state.repo) return false;
    if (state.label && !item.labels.some((l) => l.name === state.label)) return false;
    if (!within(state.range, item.updated_at ?? item.created_at)) return false;
    return true;
  });
}

export function FilterBar({ items, state, onChange }: Props) {
  const repos = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(repoSlugFromUrl(item.repository_url));
    return Array.from(set).sort();
  }, [items]);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      for (const label of item.labels) set.add(label.name);
    }
    return Array.from(set).sort();
  }, [items]);

  const isFiltering = state.repo !== '' || state.label !== '' || state.range !== 'all';

  return (
    <div className="mb-2 flex items-center gap-1.5">
      <select
        value={state.repo}
        onChange={(e) => onChange({ ...state, repo: e.target.value })}
        className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
      >
        <option value="">All repos</option>
        {repos.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        value={state.label}
        onChange={(e) => onChange({ ...state, label: e.target.value })}
        className="min-w-0 flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value={state.range}
        onChange={(e) => onChange({ ...state, range: e.target.value as DateRange })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
      >
        <option value="all">Any time</option>
        <option value="today">Today</option>
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
      {isFiltering && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTER)}
          title="Clear filters"
          className="rounded-md border border-gh-border-default px-1.5 py-1 text-[11px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
        >
          ✕
        </button>
      )}
    </div>
  );
}
