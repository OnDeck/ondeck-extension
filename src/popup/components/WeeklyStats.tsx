import { useEffect, useState } from 'react';
import { getStats, reviewsThisWeek, type AccountStats } from '../../lib/analytics';
import { getActiveAccountId } from '../../lib/accounts';

export function WeeklyStats({ refreshKey = 0 }: { refreshKey?: number }) {
  const [stats, setStats] = useState<AccountStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const id = await getActiveAccountId();
      if (!id) {
        if (!cancelled) setStats(null);
        return;
      }
      const s = await getStats(id);
      if (!cancelled) setStats(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!stats) {
    return null;
  }

  const week = reviewsThisWeek(stats);

  return (
    <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
        This week
      </div>
      <div className="text-sm font-semibold text-gh-fg-default">
        You&apos;ve reviewed {week} PR{week === 1 ? '' : 's'} this week.
      </div>
      <div className="text-[11px] text-gh-fg-muted">{stats.total} all-time</div>
    </div>
  );
}
