import { useMemo } from 'react';
import { repoFromIssue, type IssueResult } from '../../lib/github-api';

export interface IssueFilters {
  repo: string; // empty = any
  label: string; // empty = any
  updatedWithinDays: number; // 0 = any
}

export const EMPTY_FILTERS: IssueFilters = {
  repo: '',
  label: '',
  updatedWithinDays: 0,
};

interface Props {
  items: IssueResult[];
  filters: IssueFilters;
  onChange: (next: IssueFilters) => void;
}

export function applyIssueFilters(items: IssueResult[], filters: IssueFilters): IssueResult[] {
  const cutoff =
    filters.updatedWithinDays > 0
      ? Date.now() - filters.updatedWithinDays * 24 * 60 * 60 * 1000
      : 0;
  return items.filter((issue) => {
    if (filters.repo && repoFromIssue(issue) !== filters.repo) return false;
    if (filters.label && !issue.labels.some((l) => l.name === filters.label)) return false;
    if (cutoff > 0 && new Date(issue.updated_at).getTime() < cutoff) return false;
    return true;
  });
}

export function IssueFilterBar({ items, filters, onChange }: Props) {
  const repoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) set.add(repoFromIssue(i));
    return Array.from(set).sort();
  }, [items]);

  const labelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const l of i.labels) set.add(l.name);
    return Array.from(set).sort();
  }, [items]);

  const select =
    'rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-[10px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis';

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1">
      <select
        className={select}
        value={filters.repo}
        onChange={(e) => onChange({ ...filters, repo: e.target.value })}
      >
        <option value="">All repos</option>
        {repoOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        className={select}
        value={filters.label}
        onChange={(e) => onChange({ ...filters, label: e.target.value })}
      >
        <option value="">All labels</option>
        {labelOptions.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        className={select}
        value={filters.updatedWithinDays}
        onChange={(e) =>
          onChange({ ...filters, updatedWithinDays: Number(e.target.value) })
        }
      >
        <option value={0}>Any time</option>
        <option value={1}>Past day</option>
        <option value={7}>Past week</option>
        <option value={30}>Past month</option>
      </select>
      {(filters.repo || filters.label || filters.updatedWithinDays > 0) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Clear
        </button>
      )}
    </div>
  );
}
