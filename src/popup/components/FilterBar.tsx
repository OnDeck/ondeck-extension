import { useMemo, useState } from 'react';

export type DateRange = 'any' | '24h' | '7d' | '30d';

export interface Filters {
  repo: string; // substring match against "owner/repo"
  label: string; // substring match against label names
  dateRange: DateRange;
}

export const DEFAULT_FILTERS: Filters = {
  repo: '',
  label: '',
  dateRange: 'any',
};

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  /** All known repo slugs in the current list (for the datalist suggestions). */
  repoOptions?: string[];
  /** All known label names in the current list. */
  labelOptions?: string[];
}

const DATE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: 'any', label: 'Any time' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

export function FilterBar({
  filters,
  onChange,
  repoOptions = [],
  labelOptions = [],
}: Props) {
  const [open, setOpen] = useState(false);

  const uniqueRepos = useMemo(() => Array.from(new Set(repoOptions)), [repoOptions]);
  const uniqueLabels = useMemo(() => Array.from(new Set(labelOptions)), [labelOptions]);

  const hasActive =
    filters.repo !== '' || filters.label !== '' || filters.dateRange !== 'any';

  return (
    <div className="border-b border-gh-border-muted px-4 py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          {open ? 'Hide filters' : hasActive ? 'Filters (active)' : 'Filters'}
        </button>
        {hasActive && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-[11px] text-gh-fg-muted hover:text-gh-danger-emphasis"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="text-[11px] text-gh-fg-muted">Repo</span>
            <input
              type="text"
              list="gh-filter-repos"
              placeholder="owner/repo"
              value={filters.repo}
              onChange={(e) => onChange({ ...filters, repo: e.target.value })}
              className="mt-0.5 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-xs text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
            />
            <datalist id="gh-filter-repos">
              {uniqueRepos.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-[11px] text-gh-fg-muted">Label</span>
            <input
              type="text"
              list="gh-filter-labels"
              placeholder="bug, needs review, …"
              value={filters.label}
              onChange={(e) => onChange({ ...filters, label: e.target.value })}
              className="mt-0.5 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-xs text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
            />
            <datalist id="gh-filter-labels">
              {uniqueLabels.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>
          <div>
            <span className="text-[11px] text-gh-fg-muted">Date range</span>
            <div className="mt-1 flex gap-1">
              {DATE_OPTIONS.map((opt) => {
                const active = filters.dateRange === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...filters, dateRange: opt.value })}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      active
                        ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                        : 'border-gh-border-default text-gh-fg-muted hover:border-gh-accent-emphasis'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Returns a predicate for a single list row; consumers of list rows can reuse. */
export function filterMatches(
  filters: Filters,
  item: { repo: string; labels?: string[]; updatedAt: string },
): boolean {
  if (filters.repo && !item.repo.toLowerCase().includes(filters.repo.toLowerCase())) {
    return false;
  }
  if (filters.label) {
    const needle = filters.label.toLowerCase();
    const match = (item.labels ?? []).some((l) => l.toLowerCase().includes(needle));
    if (!match) return false;
  }
  if (filters.dateRange !== 'any') {
    const now = Date.now();
    const then = new Date(item.updatedAt).getTime();
    const diff = now - then;
    const day = 86_400_000;
    if (filters.dateRange === '24h' && diff > day) return false;
    if (filters.dateRange === '7d' && diff > 7 * day) return false;
    if (filters.dateRange === '30d' && diff > 30 * day) return false;
  }
  return true;
}
