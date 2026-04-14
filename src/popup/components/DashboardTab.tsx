import type { Viewer } from '../../lib/github-api';
import type { UseDashboard } from '../hooks/useDashboard';
import type { TabId } from '../tabs';

interface Props {
  viewer: Viewer;
  dashboard: UseDashboard;
  onNavigate: (tab: TabId) => void;
}

interface Row {
  tab: TabId;
  label: string;
  description: string;
  count: number | undefined;
  accent: string;
}

export function DashboardTab({ viewer, dashboard, onNavigate }: Props) {
  const counts = dashboard.counts;
  const rows: Row[] = [
    {
      tab: 'assigned',
      label: 'Assigned PRs',
      description: 'Open pull requests assigned to you',
      count: counts?.assignedPrs,
      accent: 'text-gh-accent-emphasis',
    },
    {
      tab: 'reviews',
      label: 'Review requests',
      description: 'PRs waiting on your review',
      count: counts?.reviewRequests,
      accent: 'text-gh-done-emphasis',
    },
    {
      tab: 'mentions',
      label: 'Mentions',
      description: 'Issues & PRs that @mention you',
      count: counts?.mentions,
      accent: 'text-gh-attention-emphasis',
    },
    {
      tab: 'notifications',
      label: 'Unread notifications',
      description: 'Your GitHub inbox',
      count: counts?.unreadNotifications,
      accent: 'text-gh-success-emphasis',
    },
  ];

  const isLoading = dashboard.status === 'loading' && !counts;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gh-fg-muted">
            Signed in as
          </div>
          <div className="text-sm font-semibold">{viewer.name ?? viewer.login}</div>
          <div className="text-xs text-gh-fg-muted">@{viewer.login}</div>
        </div>
        <button
          type="button"
          onClick={() => void dashboard.refresh()}
          disabled={dashboard.status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          {dashboard.status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {dashboard.status === 'error' && dashboard.error && (
        <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {dashboard.error}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.tab}>
            <button
              type="button"
              onClick={() => onNavigate(row.tab)}
              className="flex w-full items-center justify-between rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left hover:border-gh-accent-emphasis"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gh-fg-default">
                  {row.label}
                </div>
                <div className="truncate text-[11px] text-gh-fg-muted">{row.description}</div>
              </div>
              <div className={`ml-3 text-lg font-bold tabular-nums ${row.accent}`}>
                {isLoading ? '…' : (row.count ?? 0)}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
