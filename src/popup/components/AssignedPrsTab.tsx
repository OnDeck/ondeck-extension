import { useState } from 'react';
import type { Viewer } from '../../lib/github-api';
import { useAssignedPrs } from '../hooks/useAssignedPrs';
import { EMPTY_FILTERS, FilterBar, matchesFilter, type FilterState } from './FilterBar';
import { PrListItem } from './PrListItem';
import { QuickActions } from './QuickActions';

interface Props {
  viewer: Viewer;
}

/**
 * Assigned PRs tab. Lists all open PRs with the current viewer as
 * assignee, sorted by most-recently-updated. Supports repo / label /
 * date-range filters and per-row quick actions (mark reviewed,
 * reaction, draft reply).
 */
export function AssignedPrsTab({ viewer }: Props) {
  const { status, items, error, refresh } = useAssignedPrs(viewer.login);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const loading = status === 'loading' || status === 'idle';
  const visible = items.filter((item) => matchesFilter(filters, item));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Assigned PRs
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {items.length > 0 && (
        <FilterBar state={filters} onChange={setFilters} items={items} />
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {loading && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            Loading assigned PRs…
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-danger-emphasis">
            {error ?? 'Failed to load assigned PRs.'}
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            No PRs are assigned to you right now.
          </div>
        )}

        {status === 'ready' && items.length > 0 && visible.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            Nothing matches the current filters.
          </div>
        )}

        {visible.map((pr) => (
          <div key={pr.id} className="flex flex-col gap-1">
            <PrListItem
              title={pr.title}
              org={pr.org}
              repo={pr.repo}
              number={pr.number}
              htmlUrl={pr.htmlUrl}
              state={pr.state}
              draft={pr.draft}
              updatedAt={pr.updatedAt}
              reviewState={pr.reviewState}
              labels={pr.labels}
            />
            <QuickActions
              org={pr.org}
              repo={pr.repo}
              number={pr.number}
              isPullRequest
              onReviewed={() => void refresh()}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
