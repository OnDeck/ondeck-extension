import { useCallback, useEffect, useState } from 'react';
import { getWeeklyStats, type WeeklyStats } from '../../lib/stats';

export function useWeeklyStats(accountId: number | null): {
  stats: WeeklyStats;
  refresh: () => Promise<void>;
} {
  const [stats, setStats] = useState<WeeklyStats>({
    reviewsThisWeek: 0,
    reviewsLastWeek: 0,
  });

  const refresh = useCallback(async () => {
    if (accountId == null) {
      setStats({ reviewsThisWeek: 0, reviewsLastWeek: 0 });
      return;
    }
    const next = await getWeeklyStats(accountId);
    setStats(next);
  }, [accountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, refresh };
}
