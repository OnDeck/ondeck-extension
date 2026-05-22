import { getStoredAuth } from '../../lib/auth';
import {
  listNotifications,
  fetchPullRequestDetails,
  searchAssignedPrs,
  searchReviewRequested,
  searchMentions,
} from '../../lib/github-api';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import {
  NOTIFICATIONS_CACHE_KEY,
  BADGE_COLOR_DEFAULT,
} from '../../shared/constants';
import { logger } from '../../shared/logger';
import type { NewNotificationMessage } from '../../shared/types/notifications';
import type { CountsCache, UserSettings } from '../../shared/settings/types';
import { getSettings } from '../../lib/settings';

const MODULE = 'sync-worker';

const NOTIFICATION_IDS_CACHE_KEY = 'last_notification_ids_v1';

interface NotificationIdCache {
  ids: string[];
  lastSyncAt: number;
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

    const badgeText = unreadCount > 0 ? String(Math.min(unreadCount, 99)) : '';
    const badgeColor = BADGE_COLOR_DEFAULT;

    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

    logger.info({
      module: MODULE,
      message: `Synced ${filtered.length} notifications (${mergedPRIds.size} merged PRs filtered)`,
    });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Sync failed', error });
  }
}

/**
 * Calculate badge count based on user settings formula
 */
export function calculateBadgeCount(
  counts: CountsCache,
  badgeSettings: UserSettings['badge']
): number {
  switch (badgeSettings.formula) {
    case 'all':
      return counts.prs + counts.reviews + counts.mentions + counts.notifications;
    case 'actionable':
      return counts.prs + counts.reviews;
    case 'reviews-only':
      return counts.reviews;
    case 'custom':
      if (!badgeSettings.customTabs || badgeSettings.customTabs.length === 0) {
        return 0;
      }
      return badgeSettings.customTabs.reduce((sum, tab) => {
        const tabCounts: Record<string, number> = {
          prs: counts.prs,
          reviews: counts.reviews,
          mentions: counts.mentions,
          notifications: counts.notifications,
        };
        return sum + (tabCounts[tab] || 0);
      }, 0);
    default:
      return 0;
  }
}

/**
 * Fetch counts from GitHub API, cache in storage, update badge icon
 */
export async function syncAndUpdateBadge(token: string, login: string): Promise<void> {
  try {
    const settings = await getSettings();

    if (!settings.sync.enabled) {
      logger.info({ module: MODULE, message: 'Sync disabled in settings, skipping' });
      return;
    }

    logger.info({ module: MODULE, message: 'Starting sync' });

    // Fetch all counts in parallel
    const [prs, reviews, mentions, inbox] = await Promise.all([
      searchAssignedPrs(token, login),
      searchReviewRequested(token, login),
      searchMentions(token, login),
      listNotifications(token),
    ]);

    const counts: CountsCache = {
      prs: prs.items.length,
      reviews: reviews.items.length,
      mentions: mentions.items.length,
      notifications: inbox.length,
      timestamp: Date.now(),
    };

    logger.info({ module: MODULE, message: 'Counts fetched', context: counts });

    // Cache counts in local storage
    await chrome.storage.local.set({ counts });

    // Calculate badge value based on settings
    const badgeCount = calculateBadgeCount(counts, settings.badge);

    logger.info({ module: MODULE, message: `Badge count: ${badgeCount}`, context: { formula: settings.badge.formula } });

    // Update extension badge icon
    const badgeText = badgeCount > 0 ? String(Math.min(badgeCount, 99)) : '';
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });

    logger.info({ module: MODULE, message: 'Sync completed' });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Sync failed', error });
    // Keep showing last cached counts on error
  }
}
