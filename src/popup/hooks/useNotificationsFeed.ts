import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitHubApiError,
  listNotificationsPage,
  type NotificationItem,
} from '../../lib/github-api';
import type { QueryStatus } from './useGitHubQuery';

export interface NotificationsFeed {
  items: NotificationItem[];
  status: QueryStatus;
  error: GitHubApiError | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Paginated notifications feed. Loads only the first page on open (fast popup
 * open), then appends older pages on demand via `loadMore()`. `refetch()`
 * resets back to the first page — used for live-refresh and after marking read.
 */
export function useNotificationsFeed(token: string, all = true): NotificationsFeed {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [error, setError] = useState<GitHubApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextUrlRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const normalizeError = (err: unknown): GitHubApiError =>
    err instanceof GitHubApiError
      ? err
      : new GitHubApiError(err instanceof Error ? err.message : 'Unknown error', 0, 'other');

  const loadFirstPage = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const page = await listNotificationsPage(token, { all });
      if (!mountedRef.current) return;
      setItems(page.items);
      nextUrlRef.current = page.nextUrl;
      setHasMore(page.nextUrl !== null);
      setStatus('success');
    } catch (err) {
      if (!mountedRef.current) return;
      setError(normalizeError(err));
      setStatus('error');
    }
  }, [token, all]);

  const loadMore = useCallback(async () => {
    const pageUrl = nextUrlRef.current;
    if (!pageUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listNotificationsPage(token, { all, pageUrl });
      if (!mountedRef.current) return;
      setItems((prev) => [...prev, ...page.items]);
      nextUrlRef.current = page.nextUrl;
      setHasMore(page.nextUrl !== null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(normalizeError(err));
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [token, all, loadingMore]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  return {
    items,
    status,
    error,
    hasMore,
    loadingMore,
    loadMore,
    refetch: loadFirstPage,
  };
}
