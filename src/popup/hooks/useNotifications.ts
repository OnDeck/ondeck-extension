import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationItem,
  type NotificationReason,
} from '../../lib/github-api';

export type NotificationsStatus = 'loading' | 'ready' | 'error';

export interface UseNotifications {
  status: NotificationsStatus;
  items: NotificationItem[];
  groups: Array<{ repo: string; items: NotificationItem[] }>;
  error: string | null;
  reasonFilter: NotificationReason | 'all';
  setReasonFilter: (r: NotificationReason | 'all') => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useNotifications(token: string | null): UseNotifications {
  const [status, setStatus] = useState<NotificationsStatus>('loading');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<NotificationReason | 'all'>('all');

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([]);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchNotifications(token, { all: false });
      setItems(next);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      // Optimistically drop from the list so the UI feels snappy.
      setItems((prev) => prev.filter((n) => n.id !== id));
      try {
        await markNotificationRead(id, token);
      } catch (err) {
        // Rollback by reloading on failure.
        setError(err instanceof Error ? err.message : 'Failed to mark read');
        await refresh();
      }
    },
    [token, refresh],
  );

  const filtered = useMemo(
    () => (reasonFilter === 'all' ? items : items.filter((n) => n.reason === reasonFilter)),
    [items, reasonFilter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of filtered) {
      const key = n.repository.full_name;
      const bucket = map.get(key);
      if (bucket) bucket.push(n);
      else map.set(key, [n]);
    }
    return Array.from(map, ([repo, list]) => ({ repo, items: list }));
  }, [filtered]);

  return {
    status,
    items: filtered,
    groups,
    error,
    reasonFilter,
    setReasonFilter,
    refresh,
    markRead,
  };
}
