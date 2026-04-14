import { useCallback, useEffect, useRef, useState } from 'react';
import { GitHubApiError } from '../../lib/github-api';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QueryResult<T> {
  status: QueryStatus;
  data: T | null;
  error: GitHubApiError | null;
  refetch: () => void;
}

/**
 * Minimal data-fetching hook for GitHub API calls. Handles loading/error
 * state, cancellation on unmount, and re-runs when the dependency tuple
 * changes. A manual `refetch()` is exposed for pull-to-refresh actions.
 */
export function useGitHubQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
): QueryResult<T> {
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<GitHubApiError | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setStatus('success');
    } catch (err) {
      if (!mountedRef.current) return;
      const normalized =
        err instanceof GitHubApiError
          ? err
          : new GitHubApiError(err instanceof Error ? err.message : 'Unknown error', 0, 'other');
      setError(normalized);
      setStatus('error');
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void run();
  }, deps);

  return { status, data, error, refetch: run };
}
