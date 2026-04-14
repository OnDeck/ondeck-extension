import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchUnreadNotifications,
  GitHubApiError,
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

/**
 * Loads the unread notifications inbox for the current viewer.
 * Optimistically removes a thread from the list when marked as read
 * so the UI stays snappy even if the network is slow.
 */
export function useNotifications(): UseNotifications {
  const [status, setStatus] = useState<NotificationsStatus>('idle');
  const [items, setItems] = useState<GitHubNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setStatus('error');
        setError('Not authenticated');
        return;
      }
      const results = await fetchUnreadNotifications(token);
      setItems(results);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load notifications',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const { token } = await getStoredAuth();
    if (!token) return;
    await markNotificationRead(token, id);
  }, []);

  return { status, items, error, refresh: load, markRead };
}
