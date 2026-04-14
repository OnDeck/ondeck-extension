import { useEffect, useState } from 'react';
import { getStats, recordReview, type AccountStats } from '../../lib/analytics';

interface Props {
  accountId: string | null;
}

export function WeeklyStats({ accountId }: Props) {
  const [stats, setStats] = useState<AccountStats | null>(null);

  useEffect(() => {
    if (!accountId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const next = await getStats(accountId);
      if (!cancelled) setStats(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!accountId || !stats) return null;

  const week = (() => {
    const now = new Date();
    const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const wn = Math.ceil(
      ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${target.getUTCFullYear()}-W${String(wn).padStart(2, '0')}`;
  })();

  const thisWeek = stats.weeklyReviews[week] ?? 0;

  const onIncrement = async () => {
    const next = await recordReview(accountId);
    setStats(next);
  };

  return (
    <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3">
      <div className="text-xs font-semibold text-gh-fg-default">
        You've reviewed{' '}
        <span className="text-gh-accent-emphasis">{thisWeek}</span> PR
        {thisWeek === 1 ? '' : 's'} this week
      </div>
      <div className="mt-1 text-[10px] text-gh-fg-muted">
        Lifetime: {stats.lifetimeReviews}
      </div>
      <button
        type="button"
        onClick={() => void onIncrement()}
        className="mt-2 rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
      >
        +1 review
      </button>
    </div>
  );
}
