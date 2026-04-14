import type { ReactNode } from 'react';
import type { IssueSearchItem } from '../../lib/github-api';
import type { ListStatus } from '../hooks/useIssueSearch';
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
  renderItem?: (item: IssueSearchItem) => ReactNode;
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
  renderItem,
}: Props) {
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
          <div className="text-sm font-semibold">{title}</div>
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

      {items.length > 0 ? (
        <ul className="flex-1 divide-y divide-gh-border-muted overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              {renderItem ? renderItem(item) : <IssueRow item={item} showStatusBadge={showStatusBadge} />}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
