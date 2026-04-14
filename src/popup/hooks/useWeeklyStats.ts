import { useCallback, useEffect, useState } from 'react';
import { getReviewsThisWeek, incrementReviews } from '../../lib/stats';

export interface UseWeeklyStats {
  reviewsThisWeek: number;
  incrementReview: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWeeklyStats(accountId: string | null): UseWeeklyStats {
  const [reviewsThisWeek, setReviewsThisWeek] = useState(0);

  const refresh = useCallback(async () => {
    const value = await getReviewsThisWeek(accountId);
    setReviewsThisWeek(value);
  }, [accountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const incrementReview = useCallback(async () => {
    const next = await incrementReviews(accountId);
    setReviewsThisWeek(next);
  }, [accountId]);

  return { reviewsThisWeek, incrementReview, refresh };
}
