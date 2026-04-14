import { useMemo, useState, type ReactNode } from 'react';
import type { IssueSearchItem } from '../../lib/github-api';
import type { ListStatus } from '../hooks/useIssueSearch';
import { applyFilters, DEFAULT_FILTERS, uniqueLabels, uniqueRepos, type ListFilters } from '../lib/filters';
import { FilterBar } from './FilterBar';
import { IssueRow } from './IssueRow';

interface Props {
  title: string;
  onBack: () => void;
  status: ListStatus;
  items: IssueSearchItem[];
  error: string | null;
  onRefresh: () => void;
  emptyMessage: string;
  showStatusBadge?: boolean;
  showFilters?: boolean;
  renderItem?: (item: IssueSearchItem) => ReactNode;
  renderActions?: (item: IssueSearchItem) => ReactNode;
}

export function TabListView({
  title,
  onBack,
  status,
  items,
  error,
  onRefresh,
  emptyMessage,
  showStatusBadge = true,
  showFilters = true,
  renderItem,
  renderActions,
}: Props) {
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const repos = useMemo(() => uniqueRepos(items), [items]);
  const labels = useMemo(() => uniqueLabels(items), [items]);
  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  const filteredEmpty =
    status === 'ready' && filtered.length === 0 && items.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gh-border-default px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
          >
            ← Home
          </button>
          <div className="text-sm font-semibold text-gh-fg-default">{title}</div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {showFilters && items.length > 0 ? (
        <FilterBar
          filters={filters}
          repos={repos}
          labels={labels}
          onChange={setFilters}
        />
      ) : null}

      {status === 'error' ? (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis/40 bg-gh-danger-emphasis/10 p-3 text-xs text-gh-danger-emphasis">
          {error ?? 'Failed to load.'}
        </div>
      ) : null}

      {status === 'loading' && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-gh-fg-muted">
          Loading…
        </div>
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
          {emptyMessage}
        </div>
      ) : null}

      {filteredEmpty ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
          No items match the current filters.
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex-1 divide-y divide-gh-border-muted overflow-y-auto">
          {filtered.map((item) => (
            <li key={item.id}>
              {renderItem ? (
                renderItem(item)
              ) : (
                <IssueRow item={item} showStatusBadge={showStatusBadge} />
              )}
              {renderActions ? (
                <div className="px-4 pb-3">{renderActions(item)}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
