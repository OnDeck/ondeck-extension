import type { Viewer } from '../../lib/github-api';
import { useDashboardCounts } from '../hooks/useDashboardCounts';

export type DashboardTab = 'assigned' | 'reviews' | 'mentions' | 'notifications';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: DashboardTab) => void;
}

interface Row {
  id: DashboardTab;
  label: string;
  count: number | null;
}

export function Dashboard({ viewer, onNavigate }: Props) {
  const { status, counts, error, refresh } = useDashboardCounts(viewer.login);

  const rows: Row[] = [
    { id: 'assigned', label: 'Assigned PRs', count: counts?.assignedPRs ?? null },
    { id: 'reviews', label: 'Review Requests', count: counts?.reviewRequests ?? null },
    { id: 'mentions', label: 'Mentions', count: counts?.mentions ?? null },
    {
      id: 'notifications',
      label: 'Unread Notifications',
      count: counts?.notifications ?? null,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold text-gh-fg-default">Workflow</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      <ul className="mt-3 flex-1 space-y-1 px-2 pb-3">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onNavigate(row.id)}
              className="flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left text-xs text-gh-fg-default hover:border-gh-border-default hover:bg-gh-canvas-subtle"
            >
              <span>{row.label}</span>
              <span className="font-mono text-gh-fg-muted">
                {status === 'loading' && row.count === null
                  ? '…'
                  : row.count === null
                    ? '—'
                    : row.count}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {status === 'ready' &&
        counts &&
        counts.assignedPRs +
          counts.reviewRequests +
          counts.mentions +
          counts.notifications ===
          0 && (
          <div className="mx-4 mb-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            Inbox zero — nothing waiting on you right now.
          </div>
        )}
    </div>
  );
}
