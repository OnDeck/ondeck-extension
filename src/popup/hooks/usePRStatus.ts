import { useEffect, useState } from 'react';
import {
  fetchPullRequestDetails,
  fetchIssueDetails,
  type NotificationItem,
} from '../../lib/github-api';

export interface PRStatusMap {
  merged: Set<string>;
  closed: Set<string>;
  closedIssues: Set<string>;
}

/**
 * Detects PR and Issue status (merged, closed) for notifications.
 * Caches state checks to avoid redundant API calls.
 */
export function usePRStatus(
  token: string,
  notifications: NotificationItem[],
): {
  statusMap: PRStatusMap;
  loading: boolean;
} {
  const [statusMap, setStatusMap] = useState<PRStatusMap>({
    merged: new Set(),
    closed: new Set(),
    closedIssues: new Set(),
  });
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
        if (notification.subject.type === 'PullRequest' && notification.subject.url) {
          const details = await fetchPullRequestDetails(token, notification.subject.url);
          return {
            id: notification.id,
            type: 'pr' as const,
            merged: details?.merged ?? false,
            closed: details?.state === 'closed',
          };
        } else if (notification.subject.type === 'Issue' && notification.subject.url) {
          const details = await fetchIssueDetails(token, notification.subject.url);
          return {
            id: notification.id,
            type: 'issue' as const,
            merged: false,
            closed: details?.state === 'closed',
          };
        }
        return { id: notification.id, type: 'other' as const, merged: false, closed: false };
      }),
    )
      .then((results) => {
        const newMerged = new Set(statusMap.merged);
        const newClosed = new Set(statusMap.closed);
        const newClosedIssues = new Set(statusMap.closedIssues);
        const newCheckedIds = new Set(checkedIds);

        results.forEach(({ id, type, merged, closed }) => {
          newCheckedIds.add(id);
          if (type === 'pr') {
            if (merged) {
              newMerged.add(id);
            }
            if (closed && !merged) {
              newClosed.add(id);
            }
          } else if (type === 'issue' && closed) {
            newClosedIssues.add(id);
          }
        });

        setStatusMap({
          merged: newMerged,
          closed: newClosed,
          closedIssues: newClosedIssues,
        });
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
  }, [token, notifications, checkedIds, statusMap]);

  return { statusMap, loading };
}
