import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
} from '../../lib/github-api';

export type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDashboard {
  status: DashboardStatus;
  counts: DashboardCounts | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(login: string | undefined, token: string | null): UseDashboard {
  const [status, setStatus] = useState<DashboardStatus>('idle');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!login || !token) return;
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchDashboardCounts(login, token);
      setCounts(next);
      setStatus('ready');
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load dashboard';
      setError(message);
      setStatus('error');
    }
  }, [login, token]);

  useEffect(() => {
    if (login && token) void refresh();
  }, [login, token, refresh]);

  return { status, counts, error, refresh };
}
