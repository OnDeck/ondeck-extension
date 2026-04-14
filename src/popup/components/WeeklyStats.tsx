import { useEffect, useState } from 'react';
import {
  getAccountStats,
  weeklyCount,
  type AccountStats,
} from '../../lib/analytics';

interface Props {
  accountId: string;
  refreshKey?: number;
}

export function WeeklyStats({ accountId, refreshKey }: Props) {
  const [stats, setStats] = useState<AccountStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAccountStats(accountId).then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, refreshKey]);

  if (!stats) return null;
  const thisWeek = weeklyCount(stats);

  return (
    <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px]">
      <div className="font-semibold text-gh-fg-default">
        You've reviewed {thisWeek} PR{thisWeek === 1 ? '' : 's'} this week
      </div>
      <div className="text-gh-fg-muted">
        {stats.totalReviews} all-time
        {stats.lastReviewAt && ` · last on ${new Date(stats.lastReviewAt).toLocaleDateString()}`}
      </div>
    </div>
  );
}
