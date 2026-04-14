import { useCallback, useEffect, useState } from 'react';
import { GitHubApiError, type SearchIssueItem } from '../../lib/github-api';

export type IssueListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseIssueList {
  status: IssueListStatus;
  items: SearchIssueItem[];
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Generic hook for any feature tab that drives off a list of GitHub issues/PRs.
 * Pass a fetcher that closes over the auth token + login.
 */
export function useIssueList(
  enabled: boolean,
  fetcher: () => Promise<SearchIssueItem[]>,
  deps: unknown[] = [],
): UseIssueList {
  const [status, setStatus] = useState<IssueListStatus>('idle');
  const [items, setItems] = useState<SearchIssueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFetcher = useCallback(fetcher, deps);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setStatus('loading');
    setError(null);
    try {
      const next = await memoFetcher();
      setItems(next);
      setStatus('ready');
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load';
      setError(message);
      setStatus('error');
    }
  }, [enabled, memoFetcher]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { status, items, error, refresh };
}
