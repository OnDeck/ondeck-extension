import { useCallback, useEffect, useState } from 'react';
import { searchIssues, type IssueSearchItem } from '../../lib/github-api';

export type ListStatus = 'loading' | 'ready' | 'error';

export interface UseIssueList {
  status: ListStatus;
  items: IssueSearchItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Generic hook that wraps `/search/issues` and exposes loading/error/refresh.
 * Each tab (Assigned, Reviews, Mentions, …) calls this with its own query.
 */
export function useIssueList(token: string | null, query: string | null): UseIssueList {
  const [status, setStatus] = useState<ListStatus>('loading');
  const [items, setItems] = useState<IssueSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !query) {
      setItems([]);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const next = await searchIssues(query, token);
      setItems(next);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setStatus('error');
    }
  }, [token, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, items, error, refresh };
}
