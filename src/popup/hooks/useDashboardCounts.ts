import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotificationsCount,
  GitHubApiError,
  searchIssuesCount,
  SEARCH_QUERIES,
} from '../../lib/github-api';

export interface DashboardCounts {
  assignedPrs: number;
  mentions: number;
  reviewRequests: number;
  notifications: number;
}

export type CountsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDashboardCounts {
  status: CountsStatus;
  counts: DashboardCounts | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY: DashboardCounts = {
  assignedPrs: 0,
  mentions: 0,
  reviewRequests: 0,
  notifications: 0,
};

export function useDashboardCounts(enabled: boolean): UseDashboardCounts {
  const [status, setStatus] = useState<CountsStatus>('idle');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not signed in', 401, 'unauthorized');
      const [assignedPrs, mentions, reviewRequests, notifications] = await Promise.all([
        searchIssuesCount(token, SEARCH_QUERIES.assignedPrs),
        searchIssuesCount(token, SEARCH_QUERIES.mentions),
        searchIssuesCount(token, SEARCH_QUERIES.reviewRequests),
        fetchNotificationsCount(token),
      ]);
      setCounts({ assignedPrs, mentions, reviewRequests, notifications });
      setStatus('ready');
    } catch (err) {
      setCounts((prev) => prev ?? EMPTY);
      setError(err instanceof Error ? err.message : 'Failed to fetch counts');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return { status, counts, error, refresh: load };
}
