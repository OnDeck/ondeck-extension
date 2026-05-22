import { useEffect, useState } from 'react';
import {
  isNotificationForClosedPR,
  isNotificationForClosedIssue,
  type NotificationItem,
} from '../../lib/github-api';

/**
 * Detects notifications for closed PRs and issues.
 * Caches state checks to avoid redundant API calls.
 */
export function useClosedPRDetection(
  token: string,
  notifications: NotificationItem[],
): {
  closedPRs: Set<string>;
  loading: boolean;
} {
  const [closedPRs, setClosedPRs] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const itemsToCheck = notifications.filter(
      (n) =>
        (n.subject.type === 'PullRequest' || n.subject.type === 'Issue') &&
        n.subject.url &&
        !checkedIds.has(n.id),
    );

    if (itemsToCheck.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all(
      itemsToCheck.map(async (notification) => {
        const isClosed =
          notification.subject.type === 'PullRequest'
            ? await isNotificationForClosedPR(token, notification)
            : await isNotificationForClosedIssue(token, notification);
        return { id: notification.id, isClosed };
      }),
    )
      .then((results) => {
        const newClosedPRs = new Set(closedPRs);
        const newCheckedIds = new Set(checkedIds);

        results.forEach(({ id, isClosed }) => {
          newCheckedIds.add(id);
          if (isClosed) {
            newClosedPRs.add(id);
          }
        });

        setClosedPRs(newClosedPRs);
        setCheckedIds(newCheckedIds);
      })
      .catch(() => {
        // If batch check fails, mark as checked anyway to avoid retry loop
        const newCheckedIds = new Set(checkedIds);
        itemsToCheck.forEach((n) => newCheckedIds.add(n.id));
        setCheckedIds(newCheckedIds);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, notifications, checkedIds, closedPRs]);

  return { closedPRs, loading };
}
