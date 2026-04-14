import { useMemo } from 'react';

export type DateRange = 'any' | 'today' | 'week' | 'month';

export interface FilterState {
  repo: string;
  label: string;
  range: DateRange;
}

export const EMPTY_FILTER: FilterState = { repo: '', label: '', range: 'any' };

interface Props<T> {
  items: T[];
  filter: FilterState;
  onChange: (next: FilterState) => void;
  /** Extract the repo slug (org/name) for a given item. */
  getRepo: (item: T) => string;
  /** Extract labels for a given item. */
  getLabels: (item: T) => string[];
}

const RANGES: { id: DateRange; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7d' },
  { id: 'month', label: '30d' },
];

export function Filters<T>({ items, filter, onChange, getRepo, getLabels }: Props<T>) {
  const repos = useMemo(() => {
    return Array.from(new Set(items.map(getRepo))).sort();
  }, [items, getRepo]);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const l of getLabels(i)) set.add(l);
    return Array.from(set).sort();
  }, [items, getLabels]);

  return (
    <div className="flex flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2">
      <div className="flex items-center gap-2 text-[11px]">
        <label className="text-gh-fg-muted">Repo</label>
        <select
          value={filter.repo}
          onChange={(e) => onChange({ ...filter, repo: e.target.value })}
          className="flex-1 rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-0.5 text-gh-fg-default"
        >
          <option value="">All</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <label className="text-gh-fg-muted">Label</label>
        <select
          value={filter.label}
          onChange={(e) => onChange({ ...filter, label: e.target.value })}
          className="flex-1 rounded-md border border-gh-border-default bg-gh-canvas-default px-1 py-0.5 text-gh-fg-default"
        >
          <option value="">All</option>
          {labels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1 text-[11px]">
        <span className="text-gh-fg-muted">Date</span>
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange({ ...filter, range: r.id })}
            className={
              'rounded-full border px-2 py-0.5 ' +
              (filter.range === r.id
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted')
            }
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function applyFilter<T>(
  items: T[],
  filter: FilterState,
  getRepo: (i: T) => string,
  getLabels: (i: T) => string[],
  getUpdatedAt: (i: T) => string,
): T[] {
  const cutoff = rangeCutoff(filter.range);
  return items.filter((item) => {
    if (filter.repo && getRepo(item) !== filter.repo) return false;
    if (filter.label && !getLabels(item).includes(filter.label)) return false;
    if (cutoff && new Date(getUpdatedAt(item)).getTime() < cutoff) return false;
    return true;
  });
}

function rangeCutoff(range: DateRange): number | null {
  const now = Date.now();
  switch (range) {
    case 'today':
      return now - 24 * 3600 * 1000;
    case 'week':
      return now - 7 * 24 * 3600 * 1000;
    case 'month':
      return now - 30 * 24 * 3600 * 1000;
    default:
      return null;
  }
}
