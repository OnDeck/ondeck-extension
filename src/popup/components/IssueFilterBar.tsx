import { useMemo } from 'react';
import { repoFullNameFromUrl, type SearchIssueItem } from '../../lib/github-api';

export type DateRange = 'any' | 'today' | 'week' | 'month';

export interface IssueFilters {
  repo: string; // 'all' or owner/repo
  label: string; // 'all' or label name
  range: DateRange;
}

export const DEFAULT_FILTERS: IssueFilters = {
  repo: 'all',
  label: 'all',
  range: 'any',
};

interface Props {
  items: SearchIssueItem[];
  value: IssueFilters;
  onChange: (next: IssueFilters) => void;
}

export function IssueFilterBar({ items, value, onChange }: Props) {
  const repos = useMemo(() => {
    return Array.from(new Set(items.map((i) => repoFullNameFromUrl(i.repository_url)))).sort();
  }, [items]);
  const labels = useMemo(() => {
    return Array.from(new Set(items.flatMap((i) => i.labels.map((l) => l.name)))).sort();
  }, [items]);

  // Avoid rendering an empty repo / label picker when there's only one
  // option — the controls take real estate in the 400px popup.
  const showRepo = repos.length > 1;
  const showLabel = labels.length > 0;

  return (
    <div className="flex flex-wrap gap-1 text-[11px]">
      {showRepo && (
        <Select
          label="Repo"
          value={value.repo}
          onChange={(repo) => onChange({ ...value, repo })}
        >
          <option value="all">All repos</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      )}
      {showLabel && (
        <Select
          label="Label"
          value={value.label}
          onChange={(label) => onChange({ ...value, label })}
        >
          <option value="all">All labels</option>
          {labels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      )}
      <Select
        label="Updated"
        value={value.range}
        onChange={(range) => onChange({ ...value, range: range as DateRange })}
      >
        <option value="any">Any time</option>
        <option value="today">Last 24h</option>
        <option value="week">Last 7d</option>
        <option value="month">Last 30d</option>
      </Select>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-muted">
      <span className="uppercase tracking-wide">{label}</span>
      <select
        className="bg-transparent text-gh-fg-default outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function applyFilters(
  items: SearchIssueItem[],
  filters: IssueFilters,
  now: Date = new Date(),
): SearchIssueItem[] {
  const cutoff = rangeCutoff(filters.range, now);
  return items.filter((item) => {
    if (filters.repo !== 'all' && repoFullNameFromUrl(item.repository_url) !== filters.repo) {
      return false;
    }
    if (filters.label !== 'all' && !item.labels.some((l) => l.name === filters.label)) {
      return false;
    }
    if (cutoff && new Date(item.updated_at).getTime() < cutoff) {
      return false;
    }
    return true;
  });
}

function rangeCutoff(range: DateRange, now: Date): number | null {
  const DAY = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today':
      return now.getTime() - DAY;
    case 'week':
      return now.getTime() - 7 * DAY;
    case 'month':
      return now.getTime() - 30 * DAY;
    default:
      return null;
  }
}
