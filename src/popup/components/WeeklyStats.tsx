import { useEffect, useState } from 'react';
import {
  getStatsFor,
  reviewsThisWeek,
  type AccountStats,
} from '../../lib/analytics';

interface Props {
  accountId: string | null;
}

/**
 * Small "reviewed N PRs this week" widget for the dashboard home tab.
 * Pulls its data from chrome.storage.local via the analytics module —
 * counts are incremented whenever the user uses the Mark Reviewed
 * quick action.
 */
export function WeeklyStats({ accountId }: Props) {
  const [stats, setStats] = useState<AccountStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) return;
    (async () => {
      const s = await getStatsFor(accountId);
      if (!cancelled) setStats(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!stats) return null;
  const thisWeek = reviewsThisWeek(stats);

  return (
    <div className="mx-4 mb-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-wide text-gh-fg-muted">
          This week
        </div>
        <div className="text-[11px] text-gh-fg-muted">All time: {stats.total}</div>
      </div>
      <div className="mt-1 text-sm font-semibold text-gh-fg-default">
        {thisWeek} {thisWeek === 1 ? 'PR reviewed' : 'PRs reviewed'}
      </div>
      {stats.weeks.length > 1 && <WeekSparkline weeks={stats.weeks} />}
    </div>
  );
}

function WeekSparkline({ weeks }: { weeks: AccountStats['weeks'] }) {
  // Newest first in storage — flip for the sparkline so time runs
  // left-to-right like a graph.
  const ordered = [...weeks].reverse();
  const max = Math.max(1, ...ordered.map((w) => w.count));
  return (
    <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
      {ordered.map((week) => {
        const height = Math.round((week.count / max) * 20) + 2;
        return (
          <div
            key={week.weekStartIso}
            title={`${week.weekStartIso}: ${week.count}`}
            className="w-2 rounded-sm bg-gh-accent-emphasis/70"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
