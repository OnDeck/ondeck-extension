import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; counts: DashboardCounts }
  | { kind: 'error'; message: string };

interface Props {
  viewer: Viewer;
  onNavigate?: (tab: 'assigned' | 'reviews' | 'mentions' | 'notifications') => void;
}

interface Row {
  key: 'assigned' | 'reviews' | 'mentions' | 'notifications';
  label: string;
  description: string;
  count: number;
}

export function Dashboard({ viewer, onNavigate }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setState({ kind: 'error', message: 'Not signed in' });
        return;
      }
      const counts = await fetchDashboardCounts(viewer.login, token);
      setState({ kind: 'ready', counts });
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load dashboard';
      setState({ kind: 'error', message });
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading dashboard…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <div className="text-xs text-gh-danger-emphasis">{state.message}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gh-border-default px-3 py-1 text-xs text-gh-fg-default hover:border-gh-accent-emphasis"
        >
          Retry
        </button>
      </div>
    );
  }

  const rows: Row[] = [
    {
      key: 'assigned',
      label: 'Assigned PRs',
      description: 'Open PRs where you are the assignee',
      count: state.counts.assignedPrs,
    },
    {
      key: 'reviews',
      label: 'Review requests',
      description: "PRs waiting on your review",
      count: state.counts.reviewRequests,
    },
    {
      key: 'mentions',
      label: 'Mentions',
      description: 'Issues and PRs where you were @mentioned',
      count: state.counts.mentions,
    },
    {
      key: 'notifications',
      label: 'Unread notifications',
      description: 'Items from your GitHub inbox',
      count: state.counts.unreadNotifications,
    },
  ];

  const totalItems = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-gh-fg-default">Overview</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Refresh
        </button>
      </div>
      {totalItems === 0 ? (
        <div className="mx-4 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
          You're all caught up.
        </div>
      ) : null}
      <ul className="mt-1 flex-1 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onNavigate?.(row.key)}
              className="flex w-full items-center justify-between border-b border-gh-border-muted px-4 py-3 text-left hover:bg-gh-canvas-subtle"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gh-fg-default">
                  {row.label}
                </div>
                <div className="truncate text-[11px] text-gh-fg-muted">
                  {row.description}
                </div>
              </div>
              <span
                className={`ml-3 inline-flex min-w-[1.75rem] justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  row.count > 0
                    ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                    : 'border-gh-border-default text-gh-fg-muted'
                }`}
              >
                {row.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
