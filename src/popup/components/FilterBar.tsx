import { useMemo } from 'react';
import type { IssueSearchItem } from '../../lib/github-api';

export interface Filters {
  repo: string; // '' = all
  label: string; // '' = all
  maxAgeDays: number | null; // null = any
}

export const EMPTY_FILTERS: Filters = { repo: '', label: '', maxAgeDays: null };

interface Props {
  items: IssueSearchItem[];
  value: Filters;
  onChange: (next: Filters) => void;
}

const AGE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Any age', value: null },
  { label: '24h', value: 1 },
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
];

/**
 * Compact repo / label / date filters rendered above a list-tab body.
 * The repo and label dropdowns derive their options from the current
 * result set so we don't show choices that would yield zero matches.
 */
export function FilterBar({ items, value, onChange }: Props) {
  const repos = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      const marker = '/repos/';
      const idx = item.repository_url.indexOf(marker);
      if (idx >= 0) seen.add(item.repository_url.slice(idx + marker.length));
    }
    return Array.from(seen).sort();
  }, [items]);

  const labels = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) for (const l of item.labels) seen.add(l.name);
    return Array.from(seen).sort();
  }, [items]);

  return (
    <div className="flex items-center gap-1 border-b border-gh-border-muted px-3 py-2 text-[11px]">
      <select
        aria-label="Filter by repo"
        value={value.repo}
        onChange={(e) => onChange({ ...value, repo: e.target.value })}
        className="max-w-[110px] rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-default"
      >
        <option value="">All repos</option>
        {repos.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by label"
        value={value.label}
        onChange={(e) => onChange({ ...value, label: e.target.value })}
        className="max-w-[110px] rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-default"
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by age"
        value={value.maxAgeDays === null ? 'any' : String(value.maxAgeDays)}
        onChange={(e) =>
          onChange({
            ...value,
            maxAgeDays: e.target.value === 'any' ? null : Number(e.target.value),
          })
        }
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-default"
      >
        {AGE_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value === null ? 'any' : String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
      {(value.repo || value.label || value.maxAgeDays !== null) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="ml-auto rounded-md border border-gh-border-default px-2 py-0.5 text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export function applyFilters(items: IssueSearchItem[], filters: Filters): IssueSearchItem[] {
  const now = Date.now();
  return items.filter((item) => {
    if (filters.repo) {
      const marker = '/repos/';
      const idx = item.repository_url.indexOf(marker);
      const repo = idx >= 0 ? item.repository_url.slice(idx + marker.length) : '';
      if (repo !== filters.repo) return false;
    }
    if (filters.label && !item.labels.some((l) => l.name === filters.label)) return false;
    if (filters.maxAgeDays !== null) {
      const ageMs = now - new Date(item.updated_at).getTime();
      if (ageMs > filters.maxAgeDays * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });
}
