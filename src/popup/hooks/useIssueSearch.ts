import { useCallback, useEffect, useState } from 'react';
import {
  GitHubApiError,
  searchIssues,
  type IssueResult,
} from '../../lib/github-api';

export interface UseIssueSearch {
  items: IssueResult[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useIssueSearch(token: string, query: string, perPage = 30): UseIssueSearch {
  const [items, setItems] = useState<IssueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchIssues(token, query, { perPage });
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load',
      );
    } finally {
      setLoading(false);
    }
  }, [token, query, perPage]);

  useEffect(() => {
    void load();
  }, [load, tick]);

  return {
    items,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
