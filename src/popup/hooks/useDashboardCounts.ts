import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchDashboardCounts,
  type DashboardCounts,
} from '../../lib/github-counts';

export type CountsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDashboardCounts {
  status: CountsStatus;
  counts: DashboardCounts | null;
  error: string | null;
  refresh: () => void;
}

export function useDashboardCounts(login: string | null): UseDashboardCounts {
  const [status, setStatus] = useState<CountsStatus>('idle');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!login) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) throw new Error('Not signed in');
        const next = await fetchDashboardCounts(login, token);
        if (cancelled) return;
        setCounts(next);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load counts');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [login, tick]);

  return { status, counts, error, refresh };
}
