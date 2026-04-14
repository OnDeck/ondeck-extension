import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotifications,
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
  markRead: (threadId: string) => Promise<void>;
}

export function useNotifications(token: string | null): UseNotifications {
  const [status, setStatus] = useState<NotificationsStatus>('idle');
  const [items, setItems] = useState<GitHubNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchNotifications(token);
      setItems(next);
      setStatus('ready');
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load notifications';
      setError(message);
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);

  const markRead = useCallback(
    async (threadId: string) => {
      if (!token) return;
      // Optimistically remove the item so the row disappears immediately.
      setItems((current) => current.filter((n) => n.id !== threadId));
      try {
        await markNotificationRead(threadId, token);
      } catch (err) {
        // Roll back by refreshing from the server on failure.
        void refresh();
        throw err;
      }
    },
    [token, refresh],
  );

  return { status, items, error, refresh, markRead };
}
