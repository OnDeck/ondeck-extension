import { useMemo, useState, type ReactNode } from 'react';
import type { IssueResult } from '../../lib/github-api';
import { IssueRow } from './IssueRow';
import {
  applyIssueFilters,
  EMPTY_FILTERS,
  IssueFilterBar,
  type IssueFilters,
} from './IssueFilterBar';
import { useDismissed } from '../hooks/useDismissed';

interface Props {
  title: string;
  onBack: () => void;
  items: IssueResult[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  emptyLabel?: string;
  showPriority?: boolean;
  enableFilters?: boolean;
  /** When set, each row exposes a "Mark as reviewed" action backed by useDismissed. */
  dismissNamespace?: string;
  renderRow?: (issue: IssueResult) => ReactNode;
}

export function IssueListView({
  title,
  onBack,
  items,
  loading,
  error,
  onRefresh,
  emptyLabel = 'Nothing here right now.',
  showPriority,
  enableFilters,
  dismissNamespace,
  renderRow,
}: Props) {
  const [filters, setFilters] = useState<IssueFilters>(EMPTY_FILTERS);
  const dismissed = useDismissed(dismissNamespace ?? '__none__');

  const visible = useMemo(() => {
    let next = items;
    if (enableFilters) next = applyIssueFilters(next, filters);
    if (dismissNamespace) next = next.filter((i) => !dismissed.ids.has(i.id));
    return next;
  }, [items, enableFilters, filters, dismissNamespace, dismissed.ids]);

  const handleRefresh = () => {
    if (dismissNamespace) dismissed.reset();
    onRefresh();
  };

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
          >
            Back
          </button>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {enableFilters && items.length > 0 && (
        <IssueFilterBar items={items} filters={filters} onChange={setFilters} />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-xs text-gh-fg-muted">
            Loading…
          </div>
        )}
        {error && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle p-3 text-xs text-gh-danger-emphasis">
            {error}
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-center text-xs text-gh-fg-muted">
            {emptyLabel}
          </div>
        )}
        {visible.length > 0 && (
          <ul className="divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
            {visible.map((issue) => (
              <li key={issue.id} className="relative">
                {renderRow ? (
                  renderRow(issue)
                ) : (
                  <IssueRow issue={issue} showPriority={showPriority} />
                )}
                {dismissNamespace && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      dismissed.dismiss(issue.id);
                    }}
                    className="absolute right-2 top-2 rounded-md border border-gh-border-default bg-gh-canvas-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                    title="Mark as reviewed"
                  >
                    Reviewed
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
