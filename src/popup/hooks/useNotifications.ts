import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  type GitHubNotification,
} from '../../lib/github-api';

export type NotificationsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseNotifications {
  status: NotificationsStatus;
  items: GitHubNotification[];
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useNotifications(token: string | null): UseNotifications {
  const [status, setStatus] = useState<NotificationsStatus>('idle');
  const [items, setItems] = useState<GitHubNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchNotifications(token, { unreadOnly: true });
      setItems(data);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      setItems([]);
      return;
    }
    void load();
  }, [token, load]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      const prev = items;
      setItems((list) => list.filter((n) => n.id !== id));
      try {
        await markNotificationRead(token, id);
      } catch {
        // Restore on failure so the user can retry.
        setItems(prev);
      }
    },
    [token, items],
  );

  return { status, items, error, refresh: load, markRead };
}
