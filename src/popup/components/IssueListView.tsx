import type { ReactNode } from 'react';
import type { IssueResult } from '../../lib/github-api';
import { IssueRow } from './IssueRow';

interface Props {
  title: string;
  onBack: () => void;
  items: IssueResult[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  emptyLabel?: string;
  showPriority?: boolean;
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
  renderRow,
}: Props) {
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
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

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
        {!loading && !error && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-center text-xs text-gh-fg-muted">
            {emptyLabel}
          </div>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
            {items.map((issue) => (
              <li key={issue.id}>
                {renderRow ? renderRow(issue) : (
                  <IssueRow issue={issue} showPriority={showPriority} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
