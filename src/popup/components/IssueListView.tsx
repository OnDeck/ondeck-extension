import { useMemo, useState } from 'react';
import { SEARCH_QUERIES, type SearchIssueItem } from '../../lib/github-api';
import { useIssueSearch } from '../hooks/useIssueSearch';
import {
  applyFilters,
  DEFAULT_FILTERS,
  IssueFilterBar,
  type IssueFilters,
} from './IssueFilterBar';
import { IssueRow } from './IssueRow';
import { StatusMessage } from './StatusMessage';

interface Props {
  active: boolean;
  title: string;
  query: keyof typeof SEARCH_QUERIES | string;
  emptyMessage: string;
  showPriority?: boolean;
  subtitleFor?: (item: SearchIssueItem) => string | null;
  /**
   * When provided, each row gets a dismiss button that removes the item
   * from local state. Used by the Assigned / Reviews tabs to power
   * "mark as reviewed" style quick actions.
   */
  dismissLabel?: string;
  onDismiss?: (item: SearchIssueItem) => void;
}

export function IssueListView({
  active,
  title,
  query,
  emptyMessage,
  showPriority = false,
  subtitleFor,
  dismissLabel,
  onDismiss,
}: Props) {
  const resolvedQuery = (SEARCH_QUERIES as Record<string, string>)[query] ?? query;
  const { status, items, totalCount, error, refresh } = useIssueSearch(resolvedQuery, active);
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_FILTERS);
  const [dismissed, setDismissed] = useState<Set<number>>(() => new Set());

  const visible = useMemo(() => {
    if (!items) return null;
    const filtered = applyFilters(items, filters);
    return filtered.filter((item) => !dismissed.has(item.id));
  }, [items, filters, dismissed]);

  const dismiss = (item: SearchIssueItem) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    onDismiss?.(item);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
            {title}
          </h2>
          {items && (
            <div className="text-[11px] text-gh-fg-muted">
              {totalCount} total
              {visible && visible.length !== items.length
                ? ` · ${visible.length} shown`
                : items.length < totalCount
                  ? ` · showing ${items.length}`
                  : ''}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(new Set());
            void refresh();
          }}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {items && items.length > 0 && (
        <IssueFilterBar items={items} value={filters} onChange={setFilters} />
      )}

      {status === 'loading' && !items && <StatusMessage>Loading…</StatusMessage>}
      {status === 'error' && (
        <StatusMessage tone="danger">{error ?? 'Failed to load'}</StatusMessage>
      )}
      {visible && visible.length === 0 && status === 'ready' && (
        <StatusMessage>{emptyMessage}</StatusMessage>
      )}
      {visible && visible.length > 0 && (
        <ul className="flex flex-col divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
          {visible.map((item) => (
            <li key={item.id}>
              <IssueRow
                item={item}
                showPriority={showPriority}
                subtitle={subtitleFor ? subtitleFor(item) : null}
                rightSlot={
                  dismissLabel ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss(item);
                      }}
                      title={dismissLabel}
                      aria-label={`${dismissLabel}: ${item.title}`}
                      className="ml-2 shrink-0 self-start rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
                    >
                      ✓
                    </button>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
