import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { fetchDashboardCounts, type DashboardCounts } from '../../lib/github-api';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDashboardCounts {
  status: LoadStatus;
  counts: DashboardCounts | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardCounts(login: string | null): UseDashboardCounts {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!login) return;
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const result = await fetchDashboardCounts(token, login);
      setCounts(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counts');
      setStatus('error');
    }
  }, [login]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, counts, error, refresh: load };
}
