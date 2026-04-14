import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchSearchIssues,
  GitHubApiError,
  type SearchIssueItem,
} from '../../lib/github-api';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseSearchIssues {
  status: SearchStatus;
  items: SearchIssueItem[];
  total: number;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches `/search/issues` for an arbitrary query. Shared by the assigned,
 * reviews, and mentions tabs so their fetch/loading/error behavior stays
 * consistent.
 */
export function useSearchIssues(
  query: string | null,
  perPage = 30,
): UseSearchIssues {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [items, setItems] = useState<SearchIssueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) throw new GitHubApiError('Not signed in', 401, 'unauthorized');
        const res = await fetchSearchIssues(token, query, perPage);
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total_count);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Request failed');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, perPage, tick]);

  return { status, items, total, error, refresh };
}
