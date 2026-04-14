import { useCallback, useEffect, useState } from 'react';
import { fetchAggregatedCounts, type AggregatedCounts } from '../../lib/github-api';

export type CountsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseCounts {
  status: CountsStatus;
  counts: AggregatedCounts | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCounts(token: string | null): UseCounts {
  const [status, setStatus] = useState<CountsStatus>('idle');
  const [counts, setCounts] = useState<AggregatedCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchAggregatedCounts(token);
      setCounts(next);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counts');
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      setCounts(null);
      return;
    }
    void load();
  }, [token, load]);

  return { status, counts, error, refresh: load };
}
