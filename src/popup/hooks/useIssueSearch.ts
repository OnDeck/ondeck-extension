import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  GitHubApiError,
  searchIssues,
  type SearchIssueItem,
} from '../../lib/github-api';

export type IssueSearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseIssueSearch {
  status: IssueSearchStatus;
  items: SearchIssueItem[] | null;
  totalCount: number;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useIssueSearch(query: string, enabled: boolean): UseIssueSearch {
  const [status, setStatus] = useState<IssueSearchStatus>('idle');
  const [items, setItems] = useState<SearchIssueItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not signed in', 401, 'unauthorized');
      const data = await searchIssues(token, query, { perPage: 30 });
      setItems(data.items);
      setTotalCount(data.total_count);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
      setStatus('error');
    }
  }, [query]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return { status, items, totalCount, error, refresh: load };
}
