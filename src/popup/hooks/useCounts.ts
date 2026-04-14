import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardCounts, type DashboardCounts } from '../../lib/github-api';

export type CountsStatus = 'loading' | 'ready' | 'error';

export interface UseCounts {
  status: CountsStatus;
  counts: DashboardCounts | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches the four dashboard counters (assigned PRs, review requests,
 * mentions, unread notifications) for the provided user. The GitHub
 * search + notifications endpoints are hit in parallel.
 */
export function useCounts(token: string | null, login: string | null): UseCounts {
  const [status, setStatus] = useState<CountsStatus>('loading');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !login) {
      setStatus('ready');
      setCounts({ assigned: 0, reviews: 0, mentions: 0, notifications: 0 });
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchDashboardCounts(token, login);
      setCounts(next);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counts');
      setStatus('error');
    }
  }, [token, login]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, counts, error, refresh };
}
