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

const NOTIFICATION_IDS_CACHE_KEY = 'last_notification_ids_v1';

interface NotificationIdCache {
  ids: string[];
  lastSyncAt: number;
}

interface NewNotificationMessage {
  type: 'NEW_NOTIFICATIONS';
  notifications: Array<{
    id: string;
    subjectType: string;
  }>;
}

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

    // Detect new notifications
    const previousCacheResult = await chrome.storage.local.get(NOTIFICATION_IDS_CACHE_KEY);
    const previousCache = previousCacheResult[NOTIFICATION_IDS_CACHE_KEY] as NotificationIdCache | undefined;
    const previousIds = new Set(previousCache?.ids ?? []);
    const currentIds = filtered.map((n) => n.id);

    // Only send message if we have previous IDs (skip first sync)
    if (previousCache && previousIds.size > 0) {
      const newNotifications = filtered.filter((n) => !previousIds.has(n.id));

      if (newNotifications.length > 0) {
        const message: NewNotificationMessage = {
          type: 'NEW_NOTIFICATIONS',
          notifications: newNotifications.map((n) => ({
            id: n.id,
            subjectType: n.subject.type,
          })),
        };

        // Send message to popup (catch error if popup isn't open)
        chrome.runtime.sendMessage(message).catch(() => {
          // Popup might not be open, that's fine
        });
      }
    }

    // Store current IDs for next sync
    await chrome.storage.local.set({
      [NOTIFICATION_IDS_CACHE_KEY]: {
        ids: currentIds,
        lastSyncAt: Date.now(),
      } as NotificationIdCache,
    });

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
