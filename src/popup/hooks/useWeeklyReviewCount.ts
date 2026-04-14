import { useCallback, useEffect, useState } from 'react';
import { getWeeklyReviewCount } from '../../lib/stats';

export function useWeeklyReviewCount(accountId: number | null): {
  count: number;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const next = await getWeeklyReviewCount(accountId);
    setCount(next);
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { count, refresh: load };
}
