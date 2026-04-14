import type { IssueSearchItem } from '../../lib/github-api';
import { parseOwnerRepoFromRepositoryUrl } from './format';

export interface ListFilters {
  repo: string | 'all';
  label: string | 'all';
  range: 'any' | 'today' | 'week' | 'month';
}

export const DEFAULT_FILTERS: ListFilters = {
  repo: 'all',
  label: 'all',
  range: 'any',
};

function matchesRange(iso: string, range: ListFilters['range']): boolean {
  if (range === 'any') return true;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const now = Date.now();
  const day = 86_400_000;
  switch (range) {
    case 'today':
      return now - then <= day;
    case 'week':
      return now - then <= 7 * day;
    case 'month':
      return now - then <= 30 * day;
    default:
      return true;
  }
}

export function applyFilters(
  items: IssueSearchItem[],
  filters: ListFilters,
): IssueSearchItem[] {
  return items.filter((item) => {
    const repo = parseOwnerRepoFromRepositoryUrl(item.repository_url) ?? '';
    if (filters.repo !== 'all' && repo !== filters.repo) return false;
    if (
      filters.label !== 'all' &&
      !item.labels.some((l) => l.name === filters.label)
    )
      return false;
    if (!matchesRange(item.updated_at, filters.range)) return false;
    return true;
  });
}

export function uniqueRepos(items: IssueSearchItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const repo = parseOwnerRepoFromRepositoryUrl(item.repository_url);
    if (repo) set.add(repo);
  }
  return Array.from(set).sort();
}

export function uniqueLabels(items: IssueSearchItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const l of item.labels) set.add(l.name);
  }
  return Array.from(set).sort();
}
