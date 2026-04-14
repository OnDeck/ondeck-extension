import { parseRepoFromUrl, type SearchIssueItem } from '../lib/github-api';

export type DateBucket = 'all' | '24h' | '7d' | '30d';

export interface ListFilters {
  repo: string | 'all';
  label: string | 'all';
  bucket: DateBucket;
}

export const DEFAULT_FILTERS: ListFilters = {
  repo: 'all',
  label: 'all',
  bucket: 'all',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function bucketToMs(bucket: DateBucket): number | null {
  switch (bucket) {
    case '24h':
      return DAY_MS;
    case '7d':
      return 7 * DAY_MS;
    case '30d':
      return 30 * DAY_MS;
    default:
      return null;
  }
}

export function applyFilters<T extends SearchIssueItem>(
  items: T[],
  filters: ListFilters,
  now: Date = new Date(),
): T[] {
  const maxAge = bucketToMs(filters.bucket);
  const cutoff = maxAge !== null ? now.getTime() - maxAge : null;
  return items.filter((item) => {
    if (filters.repo !== 'all') {
      const repo = parseRepoFromUrl(item.repository_url);
      if (repo !== filters.repo) return false;
    }
    if (filters.label !== 'all') {
      if (!item.labels.some((l) => l.name === filters.label)) return false;
    }
    if (cutoff !== null) {
      if (Date.parse(item.updated_at) < cutoff) return false;
    }
    return true;
  });
}

export function collectRepos(items: SearchIssueItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) set.add(parseRepoFromUrl(item.repository_url));
  return Array.from(set).sort();
}

export function collectLabels(items: SearchIssueItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const label of item.labels) set.add(label.name);
  }
  return Array.from(set).sort();
}
