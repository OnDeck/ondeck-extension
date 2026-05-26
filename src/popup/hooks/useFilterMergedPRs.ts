import { useEffect, useState } from 'react';
import {
  fetchPullRequestDetails,
  type NotificationItem,
} from '../../lib/github-api';

/**
 * Filters out notifications for merged PRs.
 * Caches PR state checks to avoid redundant API calls.
 */
export function useFilterMergedPRs(
  token: string,
  notifications: NotificationItem[],
): {
  filtered: NotificationItem[];
  loading: boolean;
} {
  const [mergedPRIds, setMergedPRIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prNotifications = notifications.filter(
      (n) => n.subject.type === 'PullRequest' && n.subject.url && !checkedIds.has(n.id),
    );

    if (prNotifications.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all(
      prNotifications.map(async (notification) => {
        const details = await fetchPullRequestDetails(token, notification.subject.url!);
        return {
          id: notification.id,
          title: notification.subject.title,
          merged: details?.merged ?? false,
          state: details?.state,
        };
      }),
    )
      .then((results) => {
        const newMergedIds = new Set(mergedPRIds);
        const newCheckedIds = new Set(checkedIds);

        console.log('🔍 PR merge check results:', results.map(r => ({
          title: r.title.slice(0, 50),
          state: r.state,
          merged: r.merged,
          willFilter: r.merged,
        })));

        results.forEach(({ id, merged }) => {
          newCheckedIds.add(id);
          if (merged) {
            newMergedIds.add(id);
          }
        });

        console.log(`✂️  Filtered ${newMergedIds.size} merged PRs`);

        setMergedPRIds(newMergedIds);
        setCheckedIds(newCheckedIds);
      })
      .catch(() => {
        // If batch check fails, mark as checked anyway to avoid retry loop
        const newCheckedIds = new Set(checkedIds);
        prNotifications.forEach((n) => newCheckedIds.add(n.id));
        setCheckedIds(newCheckedIds);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, notifications, checkedIds, mergedPRIds]);

  const filtered = notifications.filter((n) => !mergedPRIds.has(n.id));

  return { filtered, loading };
}
