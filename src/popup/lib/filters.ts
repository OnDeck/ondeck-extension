import type { SearchIssueItem } from '../../lib/github-api';
import { repoSlug } from './relative-time';

export type DateRange = 'any' | 'today' | 'week' | 'month';

export interface Filters {
  repo: string;
  label: string;
  range: DateRange;
}

export const EMPTY_FILTERS: Filters = { repo: '', label: '', range: 'any' };

const RANGE_MS: Record<DateRange, number> = {
  any: Number.POSITIVE_INFINITY,
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export function applyFilters(
  items: SearchIssueItem[],
  filters: Filters,
  now: number = Date.now(),
): SearchIssueItem[] {
  const repoNeedle = filters.repo.trim().toLowerCase();
  const labelNeedle = filters.label.trim().toLowerCase();
  const limit = RANGE_MS[filters.range];

  return items.filter((item) => {
    if (repoNeedle && !repoSlug(item.repository_url).toLowerCase().includes(repoNeedle)) {
      return false;
    }
    if (labelNeedle && !item.labels.some((l) => l.name.toLowerCase().includes(labelNeedle))) {
      return false;
    }
    if (limit !== Number.POSITIVE_INFINITY) {
      const updated = Date.parse(item.updated_at);
      if (Number.isNaN(updated) || now - updated > limit) return false;
    }
    return true;
  });
}
