import { useEffect, useState } from 'react';
import type { NotificationItem } from '../../lib/github-api';
import {
  batchGetNotificationContext,
  type NotificationContext,
} from '../../lib/notification-context';

/**
 * Hook to fetch enhanced context for notifications
 * Shows details like "Changes requested", "Approved", etc.
 */
export function useNotificationContext(
  token: string,
  notifications: NotificationItem[],
): {
  contextMap: Map<string, NotificationContext>;
  loading: boolean;
} {
  const [contextMap, setContextMap] = useState<Map<string, NotificationContext>>(new Map());
  const [fetchedIds, setFetchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newNotifications = notifications.filter((n) => !fetchedIds.has(n.id));

    if (newNotifications.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    batchGetNotificationContext(token, newNotifications)
      .then((newContextMap) => {
        setContextMap((prev) => {
          const updated = new Map(prev);
          newContextMap.forEach((context, id) => {
            updated.set(id, context);
          });
          return updated;
        });

        setFetchedIds((prev) => {
          const updated = new Set(prev);
          newNotifications.forEach((n) => updated.add(n.id));
          return updated;
        });
      })
      .catch(() => {
        // If batch fails, mark as fetched to avoid retry loop
        setFetchedIds((prev) => {
          const updated = new Set(prev);
          newNotifications.forEach((n) => updated.add(n.id));
          return updated;
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, notifications, fetchedIds]);

  return { contextMap, loading };
}
