import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
} from '../../lib/github-api';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDashboardCounts {
  status: LoadStatus;
  counts: DashboardCounts | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the four top-level counts for the dashboard home tab. Reads the
 * currently-stored token + viewer from chrome.storage so the hook can be
 * called without threading the token down from props.
 */
export function useDashboardCounts(login: string | undefined): UseDashboardCounts {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!login) return;
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setStatus('error');
        setError('Not authenticated');
        return;
      }
      const next = await fetchDashboardCounts(token, login);
      setCounts(next);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load dashboard',
      );
    }
  }, [login]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, counts, error, refresh: load };
}
