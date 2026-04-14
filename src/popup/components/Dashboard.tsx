import { useEffect, useState } from 'react';
import type { DashboardCounts } from '../../lib/github-api';
import { getWeeklyReviewCount } from '../../lib/stats';
import type { TabId } from '../tabs/types';

interface Row {
  id: TabId;
  label: string;
  description: string;
}

const ROWS: Row[] = [
  { id: 'assigned', label: 'Assigned PRs', description: 'Open pull requests assigned to you' },
  { id: 'reviews', label: 'Review Requests', description: 'Pull requests awaiting your review' },
  { id: 'mentions', label: 'Mentions', description: 'Issues & PRs that @mention you' },
  { id: 'notifications', label: 'Unread Notifications', description: 'From your watched repos' },
];

interface Props {
  counts: DashboardCounts | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  accountId: number;
  onNavigate: (tab: TabId) => void;
  onRefresh: () => void;
}

export function Dashboard({
  counts,
  status,
  error,
  accountId,
  onNavigate,
  onRefresh,
}: Props) {
  const weeklyReviews = useWeeklyReviews(accountId);
  if (status === 'loading' && !counts) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading dashboard…
      </div>
    );
  }

  if (status === 'error' && !counts) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-xs text-gh-danger-emphasis">{error ?? 'Something went wrong.'}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-1.5 text-xs font-semibold hover:border-gh-accent-emphasis"
        >
          Retry
        </button>
      </div>
    );
  }

  const totals = counts ?? { assigned: 0, reviews: 0, mentions: 0, notifications: 0 };
  const allZero =
    totals.assigned === 0 &&
    totals.reviews === 0 &&
    totals.mentions === 0 &&
    totals.notifications === 0;

  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 divide-y divide-gh-border-muted overflow-y-auto">
        {ROWS.map((row) => {
          const value = countFor(row.id, totals);
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onNavigate(row.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gh-canvas-subtle"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gh-fg-default">
                    {row.label}
                  </div>
                  <div className="truncate text-[11px] text-gh-fg-muted">{row.description}</div>
                </div>
                <span
                  className={
                    'ml-2 inline-flex min-w-[28px] justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ' +
                    (value > 0
                      ? 'border-gh-accent-emphasis bg-gh-accent-emphasis text-white'
                      : 'border-gh-border-default bg-gh-canvas-subtle text-gh-fg-muted')
                  }
                  aria-label={`${value} ${row.label}`}
                >
                  {value}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {allZero && status === 'ready' && (
        <div className="border-t border-gh-border-muted px-4 py-2 text-center text-[11px] text-gh-fg-muted">
          Inbox zero. Nice work.
        </div>
      )}
      <div className="border-t border-gh-border-muted bg-gh-canvas-subtle px-4 py-2 text-center text-[11px] text-gh-fg-muted">
        {weeklyReviews === 0
          ? 'No reviews logged this week yet.'
          : `You've reviewed ${weeklyReviews} PR${weeklyReviews > 1 ? 's' : ''} this week.`}
      </div>
    </div>
  );
}

function useWeeklyReviews(accountId: number): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void getWeeklyReviewCount(accountId).then((value) => {
      if (!cancelled) setCount(value);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);
  return count;
}

function countFor(id: TabId, c: DashboardCounts): number {
  switch (id) {
    case 'assigned':
      return c.assigned;
    case 'reviews':
      return c.reviews;
    case 'mentions':
      return c.mentions;
    case 'notifications':
      return c.notifications;
    default:
      return 0;
  }
}
