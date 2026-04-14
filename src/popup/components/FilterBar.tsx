import { useMemo } from 'react';

export type DateRange = 'any' | 'today' | 'week' | 'month';

export interface FilterState {
  repo: string; // "" = any
  label: string; // "" = any
  dateRange: DateRange;
}

export const EMPTY_FILTERS: FilterState = { repo: '', label: '', dateRange: 'any' };

interface Props {
  state: FilterState;
  onChange: (next: FilterState) => void;
  // Items the filter is working over — we derive the repo + label
  // dropdown options from this list so users only see filters that
  // would actually produce results.
  items: { repo: string; org: string; labels: { name: string }[] }[];
}

/**
 * Compact filter bar for list tabs. Lets the user narrow by repo,
 * label, or date range. The repo/label dropdowns are derived from the
 * items currently in the list so we don't have to hit the GitHub API
 * for suggestions.
 */
export function FilterBar({ state, onChange, items }: Props) {
  const repoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(`${item.org}/${item.repo}`);
    return Array.from(set).sort();
  }, [items]);

  const labelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) for (const l of item.labels) set.add(l.name);
    return Array.from(set).sort();
  }, [items]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 text-[11px]">
      <select
        aria-label="Filter by repository"
        value={state.repo}
        onChange={(e) => onChange({ ...state, repo: e.target.value })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-gh-fg-default outline-none hover:border-gh-accent-emphasis focus:border-gh-accent-emphasis"
      >
        <option value="">All repos</option>
        {repoOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by label"
        value={state.label}
        onChange={(e) => onChange({ ...state, label: e.target.value })}
        disabled={labelOptions.length === 0}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-gh-fg-default outline-none hover:border-gh-accent-emphasis focus:border-gh-accent-emphasis disabled:opacity-60"
      >
        <option value="">All labels</option>
        {labelOptions.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by date"
        value={state.dateRange}
        onChange={(e) => onChange({ ...state, dateRange: e.target.value as DateRange })}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-gh-fg-default outline-none hover:border-gh-accent-emphasis focus:border-gh-accent-emphasis"
      >
        <option value="any">Any time</option>
        <option value="today">Updated today</option>
        <option value="week">Past week</option>
        <option value="month">Past month</option>
      </select>
      {(state.repo || state.label || state.dateRange !== 'any') && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="ml-auto rounded-md border border-gh-border-default px-2 py-1 text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/**
 * Pure predicate that takes a filter state and an item and returns
 * whether the item should be visible.
 */
export function matchesFilter(
  state: FilterState,
  item: { org: string; repo: string; labels: { name: string }[]; updatedAt: string },
  nowMs: number = Date.now(),
): boolean {
  if (state.repo && `${item.org}/${item.repo}` !== state.repo) return false;
  if (state.label && !item.labels.some((l) => l.name === state.label)) return false;
  if (state.dateRange !== 'any') {
    const updated = new Date(item.updatedAt).getTime();
    if (Number.isNaN(updated)) return false;
    const delta = nowMs - updated;
    const day = 86_400_000;
    if (state.dateRange === 'today' && delta > day) return false;
    if (state.dateRange === 'week' && delta > 7 * day) return false;
    if (state.dateRange === 'month' && delta > 30 * day) return false;
  }
  return true;
}
