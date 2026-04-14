import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { searchIssues, type IssueSearchItem } from '../../lib/github-api';

export type ListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseIssueSearch {
  status: ListStatus;
  items: IssueSearchItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

export function useIssueSearch(query: string | null): UseIssueSearch {
  const [status, setStatus] = useState<ListStatus>('idle');
  const [items, setItems] = useState<IssueSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!query) return;
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const result = await searchIssues(token, query);
      setItems(result.items);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load list');
      setStatus('error');
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, items, error, refresh: load };
}
