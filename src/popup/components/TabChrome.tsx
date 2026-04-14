import type { ReactNode } from 'react';
import type { IssueListStatus } from '../hooks/useIssueList';

interface HeaderProps {
  title: string;
  subtitle?: string;
  status: IssueListStatus;
  onRefresh: () => void;
}

export function TabHeader({ title, subtitle, status, onRefresh }: HeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-gh-fg-default">{title}</div>
        {subtitle && <div className="text-[11px] text-gh-fg-muted">{subtitle}</div>}
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
  );
}

interface StateProps {
  status: IssueListStatus;
  error: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

export function TabStates({ status, error, isEmpty, emptyMessage, children }: StateProps) {
  if (status === 'loading' && isEmpty) {
    return (
      <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-4 text-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }
  if (status === 'error' && error) {
    return (
      <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
        {error}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-4 text-center text-xs text-gh-fg-muted">
        {emptyMessage}
      </div>
    );
  }
  return <>{children}</>;
}
