import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  GitHubApiError,
  markNotificationRead,
  type NotificationThread,
} from '../../lib/github-api';

export type NotificationsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseNotifications {
  status: NotificationsStatus;
  threads: NotificationThread[];
  error: string | null;
  refresh: () => void;
  markRead: (threadId: string) => Promise<void>;
}

export function useNotifications(): UseNotifications {
  const [status, setStatus] = useState<NotificationsStatus>('idle');
  const [threads, setThreads] = useState<NotificationThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) throw new GitHubApiError('Not signed in', 401, 'unauthorized');
        const next = await fetchNotifications(token);
        if (cancelled) return;
        setThreads(next);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const markRead = useCallback(async (threadId: string) => {
    const { token } = await getStoredAuth();
    if (!token) return;
    await markNotificationRead(token, threadId);
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
  }, []);

  return { status, threads, error, refresh, markRead };
}
