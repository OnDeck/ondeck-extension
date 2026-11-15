import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitHubApiError,
  listNotificationsPage,
  type NotificationItem,
} from '../../lib/github-api';
import { latestUpdatedAt, mergeNotificationsById, sinceFrom } from '../../shared/notifications/merge';
import type { QueryStatus } from './useGitHubQuery';

export interface NotificationsFeed {
  items: NotificationItem[];
  status: QueryStatus;
  error: GitHubApiError | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  /** Full reload with the skeleton — use when there's nothing on screen yet. */
  refetch: () => void;
  /**
   * Merges fresh data in place, keeping scroll and loaded pages. `delta` only
   * fetches threads updated since the newest one held (for live updates); a
   * plain refresh re-reads the first page so read-elsewhere state is picked up.
   */
  refresh: (options?: { delta?: boolean }) => void;
  setUnread: (id: string, unread: boolean) => void;
}

function appendUnique(base: NotificationItem[], extra: NotificationItem[]): NotificationItem[] {
  const ids = new Set(base.map((n) => n.id));
  return [...base, ...extra.filter((n) => !ids.has(n.id))];
}

function newestFirst(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

/**
 * Paginated notifications feed. Loads only the first page on open (fast popup
 * open), then appends older pages on demand via `loadMore()`.
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
      setItems((prev) => appendUnique(prev, page.items));
      nextUrlRef.current = page.nextUrl;
      setHasMore(page.nextUrl !== null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(normalizeError(err));
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [token, all, loadingMore]);

  const itemsRef = useRef<NotificationItem[]>([]);
  itemsRef.current = items;

  const refresh = useCallback(async (options: { delta?: boolean } = {}) => {
    const cursor = options.delta ? latestUpdatedAt(itemsRef.current) : null;
    const since = cursor === null ? undefined : sinceFrom(cursor);
    try {
      const page = await listNotificationsPage(token, { all, since });
      if (!mountedRef.current) return;
      setItems((prev) => newestFirst(mergeNotificationsById(prev, page.items)));
      if (since === undefined && nextUrlRef.current === null) {
        nextUrlRef.current = page.nextUrl;
        setHasMore(page.nextUrl !== null);
      }
      setError(null);
      setStatus('success');
    } catch {
      // Keep showing what we have; the next refresh or manual retry will recover.
    }
  }, [token, all]);

  const setUnread = useCallback((id: string, unread: boolean) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread } : n)));
  }, []);

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
    refresh,
    setUnread,
  };
}
