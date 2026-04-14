import { useCallback, useEffect, useState } from 'react';
import { searchIssues, type SearchIssueItem } from '../../lib/github-api';

export type IssueListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseIssueList {
  status: IssueListStatus;
  items: SearchIssueItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

export function useIssueList(
  token: string | null,
  query: string,
  { perPage = 30 }: { perPage?: number } = {},
): UseIssueList {
  const [status, setStatus] = useState<IssueListStatus>('idle');
  const [items, setItems] = useState<SearchIssueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const result = await searchIssues(token, query, { perPage });
      setItems(result.items);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
      setStatus('error');
    }
  }, [token, query, perPage]);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      setItems([]);
      return;
    }
    void load();
  }, [token, load]);

  return { status, items, error, refresh: load };
}
