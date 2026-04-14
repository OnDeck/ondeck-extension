import { useCounts } from '../hooks/useCounts';
import { useWeeklyReviewCount } from '../hooks/useWeeklyReviewCount';
import type { TabId } from '../tabs';

interface Props {
  token: string | null;
  onNavigate: (id: TabId) => void;
  activeAccountId: number | null;
}

interface Row {
  id: TabId;
  label: string;
  description: string;
  value: number | null;
}

export function HomeView({ token, onNavigate, activeAccountId }: Props) {
  const { status, counts, error, refresh } = useCounts(token);
  const { count: weeklyReviews } = useWeeklyReviewCount(activeAccountId);

  const rows: Row[] = [
    {
      id: 'assigned',
      label: 'Assigned PRs',
      description: 'Open PRs assigned to you',
      value: counts?.assignedPrs ?? null,
    },
    {
      id: 'reviews',
      label: 'Review Requests',
      description: 'PRs awaiting your review',
      value: counts?.reviewRequests ?? null,
    },
    {
      id: 'mentions',
      label: 'Mentions',
      description: 'Open issues/PRs mentioning you',
      value: counts?.mentions ?? null,
    },
    {
      id: 'notifications',
      label: 'Unread Notifications',
      description: 'From your inbox',
      value: counts?.unreadNotifications ?? null,
    },
  ];

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Overview
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div className="mx-4 mb-3 rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 p-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load counts.'}
        </div>
      )}

      <div className="mx-4 mb-2 rounded-md border border-gh-border-muted bg-gh-canvas-subtle p-2 text-[11px] text-gh-fg-muted">
        You&rsquo;ve reviewed{' '}
        <span className="font-semibold text-gh-fg-default">{weeklyReviews}</span>{' '}
        {weeklyReviews === 1 ? 'PR' : 'PRs'} this week.
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-3">
        {rows.map((row) => {
          const isLoading = status === 'loading' && row.value === null;
          const isEmpty = status === 'ready' && row.value === 0;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onNavigate(row.id)}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-gh-canvas-subtle"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate text-sm font-medium text-gh-fg-default">
                    {row.label}
                  </div>
                  <div className="truncate text-[11px] text-gh-fg-muted">
                    {row.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <span className="inline-block h-4 w-6 animate-pulse rounded bg-gh-canvas-subtle" />
                  ) : row.value === null ? (
                    <span className="text-[11px] text-gh-fg-muted">—</span>
                  ) : (
                    <span
                      className={
                        'min-w-[1.5rem] rounded-full px-2 py-[1px] text-center text-[11px] font-semibold ' +
                        (isEmpty
                          ? 'bg-gh-canvas-subtle text-gh-fg-muted'
                          : 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis')
                      }
                    >
                      {row.value}
                    </span>
                  )}
                  <span aria-hidden className="text-gh-fg-muted">
                    ›
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
