import type { GitHubSearchItem } from './github-api';
import { ownerRepoFromUrl } from './format';

export type DateRange = 'any' | 'today' | '7d' | '30d';

export interface FilterState {
  repo: string; // '' means all
  label: string; // '' means all
  range: DateRange;
}

export const DEFAULT_FILTER: FilterState = {
  repo: '',
  label: '',
  range: 'any',
};

function withinRange(iso: string, range: DateRange): boolean {
  if (range === 'any') return true;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return false;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today':
      return now - ms < day;
    case '7d':
      return now - ms < 7 * day;
    case '30d':
      return now - ms < 30 * day;
  }
}

export function applyFilter(
  items: GitHubSearchItem[],
  filter: FilterState,
): GitHubSearchItem[] {
  return items.filter((item) => {
    if (filter.repo && ownerRepoFromUrl(item.html_url) !== filter.repo) return false;
    if (filter.label && !item.labels.some((l) => l.name === filter.label)) return false;
    if (!withinRange(item.updated_at, filter.range)) return false;
    return true;
  });
}

export function uniqueRepos(items: GitHubSearchItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const r = ownerRepoFromUrl(item.html_url);
    if (r) set.add(r);
  }
  return Array.from(set).sort();
}

export function uniqueLabels(items: GitHubSearchItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const l of item.labels) set.add(l.name);
  }
  return Array.from(set).sort();
}
