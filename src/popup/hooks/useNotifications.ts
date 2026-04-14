import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  GitHubApiError,
  markNotificationRead,
  type NotificationThread,
} from '../../lib/github-api';

export type NotificationStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseNotifications {
  status: NotificationStatus;
  items: NotificationThread[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

export function useNotifications(enabled: boolean): UseNotifications {
  const [status, setStatus] = useState<NotificationStatus>('idle');
  const [items, setItems] = useState<NotificationThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not signed in', 401, 'unauthorized');
      const data = await fetchNotifications(token);
      setItems(data);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setStatus('error');
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    // Optimistic removal — the notifications endpoint already filters to
    // unread, so dropping the row is the right local update.
    setItems((prev) => prev?.filter((n) => n.id !== id) ?? prev);
    try {
      const { token } = await getStoredAuth();
      if (!token) return;
      await markNotificationRead(token, id);
    } catch (err) {
      // On failure, reload to restore truth.
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      await load();
    }
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return { status, items, error, refresh: load, markRead };
}
