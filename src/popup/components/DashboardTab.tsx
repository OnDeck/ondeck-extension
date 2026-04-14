import { useCallback, useEffect, useState } from 'react';
import { getStoredToken } from '../../lib/auth';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
  type Viewer,
} from '../../lib/github-api';
import type { TabId } from './TabBar';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: TabId) => void;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; counts: DashboardCounts }
  | { kind: 'error'; message: string };

interface Row {
  id: string;
  label: string;
  value: number;
  target: TabId;
}

function buildRows(counts: DashboardCounts): Row[] {
  return [
    { id: 'assigned', label: 'Assigned PRs', value: counts.assignedPrs, target: 'assigned' },
    { id: 'reviews', label: 'Review Requests', value: counts.reviewRequests, target: 'reviews' },
    { id: 'mentions', label: 'Mentions', value: counts.mentions, target: 'mentions' },
    {
      id: 'notifications',
      label: 'Unread Notifications',
      value: counts.unreadNotifications,
      target: 'notifications',
    },
  ];
}

export function DashboardTab({ viewer, onNavigate }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const token = await getStoredToken();
    if (!token) {
      setState({ kind: 'error', message: 'Not signed in' });
      return;
    }
    try {
      const counts = await fetchDashboardCounts(viewer.login, token);
      setState({ kind: 'ready', counts });
    } catch (err) {
      const message =
        err instanceof GitHubApiError ? err.message : 'Failed to load dashboard counts';
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
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-xs text-gh-danger-emphasis">{state.message}</p>
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

  const rows = buildRows(state.counts);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm font-semibold text-gh-fg-default">Inbox zero</p>
        <p className="text-xs text-gh-fg-muted">
          No assigned PRs, reviews, mentions, or notifications waiting.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gh-border-muted">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onNavigate(row.target)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gh-canvas-subtle"
          >
            <span className="text-sm text-gh-fg-default">{row.label}</span>
            <span
              className={
                'inline-flex min-w-[1.75rem] items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ' +
                (row.value > 0
                  ? 'bg-gh-accent-emphasis text-white'
                  : 'border border-gh-border-default text-gh-fg-muted')
              }
            >
              {row.value}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
