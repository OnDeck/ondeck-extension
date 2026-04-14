import { useEffect, useState } from 'react';
import { getWeeklyReviewCount, subscribeStats } from '../../lib/stats';

export function useWeeklyReviewCount(accountId: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!accountId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const next = await getWeeklyReviewCount(accountId);
      if (!cancelled) setCount(next);
    };
    void refresh();
    const unsubscribe = subscribeStats(() => void refresh());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [accountId]);

  return count;
}
