import type { SearchPullRequest } from '../../lib/github-api';

export type DateRange = 'all' | '7d' | '30d';

export interface Filters {
  repo: string; // '' = all
  label: string; // '' = all
  range: DateRange;
}

export const INITIAL_FILTERS: Filters = { repo: '', label: '', range: 'all' };

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
];

interface Option {
  value: string;
  label: string;
}

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  repos: Option[];
  labels: Option[];
}

export function FilterBar({ filters, onChange, repos, labels }: Props) {
  const handleRepo = (value: string) => onChange({ ...filters, repo: value });
  const handleLabel = (value: string) => onChange({ ...filters, label: value });
  const handleRange = (value: DateRange) => onChange({ ...filters, range: value });

  const isActive =
    filters.repo !== '' || filters.label !== '' || filters.range !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gh-border-muted px-2 py-2">
      <select
        aria-label="Filter by repository"
        value={filters.repo}
        onChange={(e) => handleRepo(e.target.value)}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-[11px] text-gh-fg-default focus:border-gh-accent-emphasis focus:outline-none"
      >
        <option value="">All repos</option>
        {repos.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by label"
        value={filters.label}
        onChange={(e) => handleLabel(e.target.value)}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-[11px] text-gh-fg-default focus:border-gh-accent-emphasis focus:outline-none"
      >
        <option value="">All labels</option>
        {labels.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by date range"
        value={filters.range}
        onChange={(e) => handleRange(e.target.value as DateRange)}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-[11px] text-gh-fg-default focus:border-gh-accent-emphasis focus:outline-none"
      >
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isActive && (
        <button
          type="button"
          onClick={() => onChange(INITIAL_FILTERS)}
          className="text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export function deriveRepoOptions(items: { repository_url: string }[]): Option[] {
  const set = new Set<string>();
  for (const item of items) {
    const idx = item.repository_url.indexOf('/repos/');
    const nwo = idx === -1 ? item.repository_url : item.repository_url.slice(idx + '/repos/'.length);
    set.add(nwo);
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

export function deriveLabelOptions(items: SearchPullRequest[]): Option[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const label of item.labels) set.add(label.name);
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

export function applyFilters<T extends SearchPullRequest>(
  items: T[],
  filters: Filters,
  now: Date = new Date(),
): T[] {
  let cutoff = 0;
  if (filters.range === '7d') cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  else if (filters.range === '30d') cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (filters.repo) {
      const idx = item.repository_url.indexOf('/repos/');
      const nwo = idx === -1 ? item.repository_url : item.repository_url.slice(idx + '/repos/'.length);
      if (nwo !== filters.repo) return false;
    }
    if (filters.label) {
      if (!item.labels.some((label) => label.name === filters.label)) return false;
    }
    if (cutoff > 0) {
      const updated = new Date(item.updated_at).getTime();
      if (Number.isFinite(updated) && updated < cutoff) return false;
    }
    return true;
  });
}
