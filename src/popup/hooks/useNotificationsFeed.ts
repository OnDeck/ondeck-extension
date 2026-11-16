import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitHubApiError,
  listNotificationsPage,
  type NotificationItem,
} from '../../lib/github-api';
import { readNotificationCache } from '../../shared/notifications/cache';
import { latestUpdatedAt, mergeNotificationsById, sinceFrom } from '../../shared/notifications/merge';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface NotificationsFeed {
  items: NotificationItem[];
  status: QueryStatus;
  error: GitHubApiError | null;
  hasMore: boolean;
  loadingMore: boolean;
  /** Epoch ms of the data on screen; the worker's sync time while showing the cache. */
  updatedAt: number | null;
  refreshing: boolean;
  /** Last refresh failure that didn't replace the list (network blips, rate limits). */
  refreshError: GitHubApiError | null;
  loadMore: () => void;
  /** Full reload with the skeleton — use when there's nothing on screen yet. */
  refetch: () => void;
  /**
   * Merges fresh data in place, keeping scroll and loaded pages. `delta` only
   * fetches threads updated since the newest one held (for live updates); a
   * plain refresh re-reads the first page so read-elsewhere state is picked up.
   */
  refresh: (options?: { delta?: boolean }) => void;
  setUnread: (ids: string | string[], unread: boolean) => void;
}

function appendUnique(base: NotificationItem[], extra: NotificationItem[]): NotificationItem[] {
  const ids = new Set(base.map((n) => n.id));
  return [...base, ...extra.filter((n) => !ids.has(n.id))];
}

function newestFirst(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

function normalizeError(err: unknown): GitHubApiError {
  return err instanceof GitHubApiError
    ? err
    : new GitHubApiError(err instanceof Error ? err.message : 'Unknown error', 0, 'other');
}

// A cached list is useless once the token is bad; swap it for the error screen
// so the user can reconnect instead of staring at stale data.
function invalidatesList(err: GitHubApiError): boolean {
  return err.kind === 'unauthorized' || err.kind === 'forbidden';
}

/**
 * Paginated notifications feed. Opens instantly from the background worker's
 * cache when there is one, refreshing in place, and otherwise loads the first
 * page behind a skeleton. Older pages load on demand via `loadMore()`.
 */
export function useNotificationsFeed(token: string, all = true): NotificationsFeed {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [error, setError] = useState<GitHubApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<GitHubApiError | null>(null);
  const nextUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const itemsRef = useRef<NotificationItem[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadFirstPage = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setRefreshError(null);
    try {
      const page = await listNotificationsPage(token, { all });
      if (!mountedRef.current) return;
      setItems(page.items);
      nextUrlRef.current = page.nextUrl;
      setHasMore(page.nextUrl !== null);
      setUpdatedAt(Date.now());
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
      setRefreshError(normalizeError(err));
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [token, all, loadingMore]);

  const refresh = useCallback(
    async (options: { delta?: boolean } = {}) => {
      const cursor = options.delta ? latestUpdatedAt(itemsRef.current) : null;
      const since = cursor === null ? undefined : sinceFrom(cursor);
      setRefreshing(true);
      try {
        const page = await listNotificationsPage(token, { all, since });
        if (!mountedRef.current) return;
        setItems((prev) => newestFirst(mergeNotificationsById(prev, page.items)));
        if (since === undefined && nextUrlRef.current === null) {
          nextUrlRef.current = page.nextUrl;
          setHasMore(page.nextUrl !== null);
        }
        setUpdatedAt(Date.now());
        setError(null);
        setRefreshError(null);
        setStatus('success');
      } catch (err) {
        if (!mountedRef.current) return;
        const apiError = normalizeError(err);
        if (invalidatesList(apiError)) {
          setError(apiError);
          setStatus('error');
        } else {
          setRefreshError(apiError);
        }
      } finally {
        if (mountedRef.current) setRefreshing(false);
      }
    },
    [token, all],
  );

  const setUnread = useCallback((ids: string | string[], unread: boolean) => {
    const targets = new Set(Array.isArray(ids) ? ids : [ids]);
    setItems((prev) => prev.map((n) => (targets.has(n.id) ? { ...n, unread } : n)));
  }, []);

  // Paint the worker's cached inbox first so the popup opens instantly, then
  // refresh it in place. Without a cache, fall back to the skeleton load.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await readNotificationCache().catch(() => undefined);
      if (cancelled) return;
      if (cached && cached.items.length > 0) {
        setItems(newestFirst(cached.items));
        setUpdatedAt(cached.fetchedAt);
        setStatus('success');
        void refresh();
      } else {
        void loadFirstPage();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFirstPage, refresh]);

  return {
    items,
    status,
    error,
    hasMore,
    loadingMore,
    updatedAt,
    refreshing,
    refreshError,
    loadMore,
    refetch: loadFirstPage,
    refresh,
    setUnread,
  };
}
