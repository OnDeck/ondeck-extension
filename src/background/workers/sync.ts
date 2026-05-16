import { getStoredAuth } from '../../lib/auth';
import { listNotifications, fetchPullRequestDetails } from '../../lib/github-api';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import {
  NOTIFICATIONS_CACHE_KEY,
  BADGE_COLOR_DEFAULT,
  BADGE_COLOR_CRITICAL,
} from '../../shared/constants';
import { logger } from '../../shared/logger';

const MODULE = 'sync-worker';

export interface NotificationCache {
  items: ReturnType<typeof prioritizeAll>;
  fetchedAt: number;
}

export async function syncNotifications(): Promise<void> {
  const auth = await getStoredAuth();
  if (!auth.token) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  try {
    const raw = await listNotifications(auth.token, { all: false });

    // Filter out merged PRs
    const mergedPRIds = new Set<string>();
    for (const notification of raw) {
      if (notification.subject.type === 'PullRequest' && notification.subject.url) {
        const details = await fetchPullRequestDetails(auth.token, notification.subject.url);
        if (details?.merged) {
          mergedPRIds.add(notification.id);
        }
      }
    }

    const filtered = raw.filter((n) => !mergedPRIds.has(n.id));
    const prioritized = prioritizeAll(filtered);

    const cache: NotificationCache = { items: prioritized, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [NOTIFICATIONS_CACHE_KEY]: cache });

    const unreadCount = filtered.filter((n) => n.unread).length;
    const criticalCount = prioritized.filter(
      (n) => n.priority.level === 'critical',
    ).length;

    const badgeText = unreadCount > 0 ? String(Math.min(unreadCount, 99)) : '';
    const badgeColor = criticalCount > 0 ? BADGE_COLOR_CRITICAL : BADGE_COLOR_DEFAULT;

    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

    logger.info({
      module: MODULE,
      message: `Synced ${filtered.length} notifications (${criticalCount} critical, ${mergedPRIds.size} merged PRs filtered)`,
    });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Sync failed', error });
  }
}
