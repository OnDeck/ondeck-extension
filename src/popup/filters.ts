import type { IssueSearchItem } from '../lib/github-api';
import { ownerRepoFromIssueUrl } from '../lib/format';

export type DateRange = 'any' | 'today' | '7d' | '30d';

export interface FilterState {
  repo: string;
  label: string;
  dateRange: DateRange;
}

export const EMPTY_FILTER: FilterState = {
  repo: '',
  label: '',
  dateRange: 'any',
};

function withinRange(iso: string, range: DateRange): boolean {
  if (range === 'any') return true;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return true;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const windowMs =
    range === 'today' ? day : range === '7d' ? 7 * day : 30 * day;
  return now - then <= windowMs;
}

export function applyFilter(
  items: IssueSearchItem[],
  filter: FilterState,
): IssueSearchItem[] {
  return items.filter((item) => {
    if (filter.repo.trim()) {
      const repo = ownerRepoFromIssueUrl(item.repository_url).toLowerCase();
      if (!repo.includes(filter.repo.trim().toLowerCase())) return false;
    }
    if (filter.label.trim()) {
      const needle = filter.label.trim().toLowerCase();
      const matched = item.labels?.some((l) => l.name.toLowerCase().includes(needle));
      if (!matched) return false;
    }
    if (!withinRange(item.updated_at, filter.dateRange)) return false;
    return true;
  });
}

export function availableRepos(items: IssueSearchItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const r = ownerRepoFromIssueUrl(item.repository_url);
    if (r) set.add(r);
  }
  return Array.from(set).sort();
}
