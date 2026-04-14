import type { ReactNode } from 'react';
import type { ListStatus } from '../../hooks/useIssueList';

interface Props {
  title: string;
  status: ListStatus;
  error: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  onRefresh: () => void;
  children: ReactNode;
}

/**
 * Shared frame for list-style tabs. Renders a compact header with a
 * manual refresh button and unified loading/error/empty states so each
 * tab can focus on its specific row rendering.
 */
export function TabShell({
  title,
  status,
  error,
  isEmpty,
  emptyMessage,
  onRefresh,
  children,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-muted px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
          {title}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] font-semibold text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-xs text-gh-danger-emphasis">
              {error ?? 'Something went wrong.'}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-1.5 text-xs font-semibold hover:border-gh-accent-emphasis"
            >
              Retry
            </button>
          </div>
        )}
        {status !== 'error' && isEmpty && status !== 'loading' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
            {emptyMessage}
          </div>
        )}
        {status !== 'error' && !isEmpty && children}
        {status === 'loading' && isEmpty && (
          <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
