import { useMemo } from 'react';
import { repoSlugFromUrl, type SearchIssueItem } from '../../lib/github-api';

export interface FeedFilterState {
  repo: string;
  label: string;
  sinceDays: number | null;
}

export const INITIAL_FILTERS: FeedFilterState = {
  repo: '',
  label: '',
  sinceDays: null,
};

interface Props {
  items: SearchIssueItem[];
  state: FeedFilterState;
  onChange: (next: FeedFilterState) => void;
}

const SINCE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Any time', days: null },
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
];

export function FeedFilters({ items, state, onChange }: Props) {
  const repoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(repoSlugFromUrl(item.repository_url));
    return Array.from(set).sort();
  }, [items]);

  const labelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) for (const label of item.labels) set.add(label.name);
    return Array.from(set).sort();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1 text-[11px]">
      <select
        value={state.repo}
        onChange={(e) => onChange({ ...state, repo: e.target.value })}
        className="max-w-[140px] rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-default"
      >
        <option value="">All repos</option>
        {repoOptions.map((slug) => (
          <option key={slug} value={slug}>
            {slug}
          </option>
        ))}
      </select>
      <select
        value={state.label}
        onChange={(e) => onChange({ ...state, label: e.target.value })}
        className="max-w-[140px] rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-default"
      >
        <option value="">All labels</option>
        {labelOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={state.sinceDays ?? ''}
        onChange={(e) =>
          onChange({
            ...state,
            sinceDays: e.target.value === '' ? null : Number(e.target.value),
          })
        }
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1.5 py-0.5 text-gh-fg-default"
      >
        {SINCE_OPTIONS.map((option) => (
          <option key={option.label} value={option.days ?? ''}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function applyFilters(
  items: SearchIssueItem[],
  state: FeedFilterState,
): SearchIssueItem[] {
  return items.filter((item) => {
    if (state.repo && repoSlugFromUrl(item.repository_url) !== state.repo) return false;
    if (state.label && !item.labels.some((l) => l.name === state.label)) return false;
    if (state.sinceDays != null) {
      const cutoff = Date.now() - state.sinceDays * 24 * 60 * 60 * 1000;
      if (Date.parse(item.updated_at) < cutoff) return false;
    }
    return true;
  });
}
