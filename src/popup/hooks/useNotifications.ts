import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  markNotificationRead,
  type GithubNotification,
} from '../../lib/github-api';

export type NotificationsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseNotifications {
  status: NotificationsStatus;
  items: GithubNotification[];
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (threadId: string) => Promise<void>;
}

export function useNotifications(): UseNotifications {
  const [status, setStatus] = useState<NotificationsStatus>('idle');
  const [items, setItems] = useState<GithubNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const data = await fetchNotifications(token, { all: false });
      setItems(data);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setStatus('error');
    }
  }, []);

  const markRead = useCallback(async (threadId: string) => {
    const { token } = await getStoredAuth();
    if (!token) return;
    // Optimistically remove the item from the list.
    setItems((prev) => prev.filter((n) => n.id !== threadId));
    try {
      await markNotificationRead(token, threadId);
    } catch (err) {
      // Roll back on failure by refetching.
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      await load();
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return { status, items, error, refresh: load, markRead };
}
