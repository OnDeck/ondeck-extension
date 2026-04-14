import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardCounts, type DashboardCounts } from '../../lib/github-api';

export interface DashboardCountsState {
  counts: DashboardCounts | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardCounts(
  token: string | null,
  login: string | null,
): DashboardCountsState {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!token || !login) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboardCounts(token, login)
      .then((res) => {
        if (!cancelled) setCounts(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load counts');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, login, tick]);

  return { counts, loading, error, refresh };
}
