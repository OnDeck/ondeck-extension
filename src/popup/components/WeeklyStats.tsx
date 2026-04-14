import { useCallback, useEffect, useState } from 'react';
import {
  getStats,
  recordReview,
  reviewsThisWeek,
  type AccountStats,
} from '../../lib/analytics';

interface Props {
  accountId: string;
}

export function WeeklyStats({ accountId }: Props) {
  const [stats, setStats] = useState<AccountStats | null>(null);

  const load = useCallback(async () => {
    setStats(await getStats(accountId));
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!stats) return null;

  const weekly = reviewsThisWeek(stats);

  return (
    <div className="flex items-center justify-between rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-xs">
      <div>
        <div className="text-[11px] text-gh-fg-muted">This week</div>
        <div className="text-sm font-semibold text-gh-fg-default">
          {weekly} {weekly === 1 ? 'review' : 'reviews'}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] text-gh-fg-muted">All time</div>
        <div className="text-sm font-semibold text-gh-fg-default">{stats.totalReviews}</div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await recordReview(accountId);
          await load();
        }}
        className="ml-2 rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis"
        title="Log a review you completed"
      >
        +1
      </button>
    </div>
  );
}
