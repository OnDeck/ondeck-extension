import type { ReactNode } from 'react';
import { SEARCH_QUERIES, type SearchIssueItem } from '../../lib/github-api';
import { useIssueSearch } from '../hooks/useIssueSearch';
import { IssueRow } from './IssueRow';
import { StatusMessage } from './StatusMessage';

interface Props {
  active: boolean;
  title: string;
  query: keyof typeof SEARCH_QUERIES | string;
  emptyMessage: string;
  showPriority?: boolean;
  subtitleFor?: (item: SearchIssueItem) => string | null;
  footer?: ReactNode;
}

export function IssueListView({
  active,
  title,
  query,
  emptyMessage,
  showPriority = false,
  subtitleFor,
  footer,
}: Props) {
  const resolvedQuery = (SEARCH_QUERIES as Record<string, string>)[query] ?? query;
  const { status, items, totalCount, error, refresh } = useIssueSearch(resolvedQuery, active);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
            {title}
          </h2>
          {items && (
            <div className="text-[11px] text-gh-fg-muted">
              {totalCount} total{items.length < totalCount ? ` · showing ${items.length}` : ''}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {footer}

      {status === 'loading' && !items && <StatusMessage>Loading…</StatusMessage>}
      {status === 'error' && (
        <StatusMessage tone="danger">{error ?? 'Failed to load'}</StatusMessage>
      )}
      {items && items.length === 0 && status === 'ready' && (
        <StatusMessage>{emptyMessage}</StatusMessage>
      )}
      {items && items.length > 0 && (
        <ul className="flex flex-col divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
          {items.map((item) => (
            <li key={item.id}>
              <IssueRow
                item={item}
                showPriority={showPriority}
                subtitle={subtitleFor ? subtitleFor(item) : null}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
