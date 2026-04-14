import { useEffect, useState } from 'react';
import { getStats, type AccountStats, reviewsThisWeek } from '../../lib/analytics';

export interface WeeklyStats {
  week: number;
  lifetime: number;
}

export function useWeeklyStats(accountId: number | null, tick: number): WeeklyStats {
  const [stats, setStats] = useState<WeeklyStats>({ week: 0, lifetime: 0 });

  useEffect(() => {
    if (accountId === null) return;
    let cancelled = false;
    Promise.all([reviewsThisWeek(accountId), getStats(accountId)]).then(
      ([week, full]: [number, AccountStats]) => {
        if (!cancelled) setStats({ week, lifetime: full.lifetime });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountId, tick]);

  return stats;
}
