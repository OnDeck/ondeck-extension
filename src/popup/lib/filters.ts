import type { SearchIssueItem } from '../../lib/github-api';
import { repoFromIssue } from '../../lib/github-api';

export type DateRange = 'any' | 'today' | '7d' | '30d';

export interface FilterState {
  repo: string; // '' = all
  label: string; // '' = all
  range: DateRange;
}

export const EMPTY_FILTER: FilterState = { repo: '', label: '', range: 'any' };

const DAY_MS = 24 * 60 * 60 * 1000;

export function uniqueRepos(items: SearchIssueItem[]): string[] {
  return Array.from(new Set(items.map(repoFromIssue))).sort();
}

export function uniqueLabels(items: SearchIssueItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const label of item.labels) set.add(label.name);
  }
  return Array.from(set).sort();
}

export function applyFilter(
  items: SearchIssueItem[],
  filter: FilterState,
): SearchIssueItem[] {
  const cutoff = filterCutoff(filter.range);
  return items.filter((item) => {
    if (filter.repo && repoFromIssue(item) !== filter.repo) return false;
    if (filter.label && !item.labels.some((l) => l.name === filter.label)) return false;
    if (cutoff && new Date(item.updated_at).getTime() < cutoff) return false;
    return true;
  });
}

function filterCutoff(range: DateRange): number | null {
  const now = Date.now();
  switch (range) {
    case 'today':
      return now - DAY_MS;
    case '7d':
      return now - 7 * DAY_MS;
    case '30d':
      return now - 30 * DAY_MS;
    default:
      return null;
  }
}
