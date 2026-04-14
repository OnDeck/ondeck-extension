import { useCallback, useEffect, useState } from 'react';
import { searchIssues, type SearchIssueItem } from '../../lib/github-api';

export interface IssueSearchState {
  items: SearchIssueItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useIssueSearch(
  token: string | null,
  query: string | null,
): IssueSearchState {
  const [items, setItems] = useState<SearchIssueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!token || !query) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchIssues(token, query)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, tick]);

  return { items, loading, error, refresh };
}
