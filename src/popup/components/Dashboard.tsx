import type { Viewer } from '../../lib/github-api';
import { useDashboardCounts } from '../hooks/useDashboardCounts';
import { useWeeklyReviewCount } from '../hooks/useWeeklyReviewCount';
import type { TabId } from '../navigation';

interface Props {
  viewer: Viewer;
  accountId: string | null;
  onNavigate: (tab: TabId) => void;
}

interface Row {
  id: TabId;
  label: string;
  description: string;
  value: number | null;
}

export function Dashboard({ viewer, accountId, onNavigate }: Props) {
  const { status, counts, error, refresh } = useDashboardCounts(viewer.login);
  const weeklyReviews = useWeeklyReviewCount(accountId);

  const rows: Row[] = [
    {
      id: 'assigned',
      label: 'Assigned PRs',
      description: 'Pull requests waiting on you',
      value: counts?.assignedPrs ?? null,
    },
    {
      id: 'reviews',
      label: 'Review requests',
      description: 'Reviews requested from you',
      value: counts?.reviewRequests ?? null,
    },
    {
      id: 'mentions',
      label: 'Mentions',
      description: 'Issues & PRs that @mention you',
      value: counts?.mentions ?? null,
    },
    {
      id: 'notifications',
      label: 'Unread notifications',
      description: 'Your GitHub inbox',
      value: counts?.notifications ?? null,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Overview</div>
          <div className="text-xs text-gh-fg-muted">
            Signed in as @{viewer.login}
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div className="rounded-md border border-gh-danger-emphasis/50 bg-gh-danger-emphasis/10 px-3 py-2 text-xs text-gh-danger-emphasis">
          {error ?? 'Failed to load counts'}
        </div>
      )}

      <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
        You&apos;ve marked{' '}
        <span className="font-semibold text-gh-fg-default">
          {weeklyReviews}
        </span>{' '}
        PR{weeklyReviews === 1 ? '' : 's'} as reviewed this week.
      </div>

      <ul className="flex flex-col divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onNavigate(row.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-gh-border-muted/40"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gh-fg-default">
                  {row.label}
                </div>
                <div className="truncate text-xs text-gh-fg-muted">
                  {row.description}
                </div>
              </div>
              <CountBadge value={row.value} loading={status === 'loading'} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountBadge({ value, loading }: { value: number | null; loading: boolean }) {
  if (loading && value === null) {
    return (
      <span className="h-5 w-8 animate-pulse rounded-md bg-gh-border-muted" />
    );
  }
  if (value === null) {
    return <span className="text-xs text-gh-fg-muted">—</span>;
  }
  const display = value > 99 ? '99+' : String(value);
  const emphasis =
    value === 0
      ? 'border-gh-border-default text-gh-fg-muted'
      : 'border-gh-accent-emphasis/60 text-gh-accent-emphasis';
  return (
    <span
      className={`inline-flex min-w-[28px] justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${emphasis}`}
    >
      {display}
    </span>
  );
}
