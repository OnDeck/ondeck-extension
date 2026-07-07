import { getStoredAuth } from '../../lib/auth';
import {
  listNotifications,
  searchAssignedPrs,
  searchReviewRequested,
  searchMentions,
} from '../../lib/github-api';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import {
  mergeNotificationsById,
  latestUpdatedAt,
  sinceFrom,
} from '../../shared/notifications/merge';
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

interface SyncNotificationsOptions {
  /**
   * Fetch the whole unread inbox instead of only what changed since the last
   * sync. Use at reconciliation points (startup, settings change, after a
   * mark-as-read) so threads read elsewhere are pruned from the cached set.
   */
  full?: boolean;
  /**
   * Whether this call owns the toolbar badge. Set to false when a follow-up
   * `syncAndUpdateBadge` will paint the badge from the user's formula, so the
   * two don't race.
   */
  setBadge?: boolean;
}

async function getCachedNotifications(): Promise<NotificationCache | undefined> {
  const result = await chrome.storage.local.get(NOTIFICATIONS_CACHE_KEY);
  return result[NOTIFICATIONS_CACHE_KEY] as NotificationCache | undefined;
}

/**
 * Sync the unread notification inbox. By default this is *incremental*: it
 * fetches only threads updated since the last sync (GitHub's `since`) and
 * merges them onto the cached set, so we stop redownloading the whole inbox on
 * every tick. Pass `{ full: true }` to reconcile against the full unread set.
 */
export async function syncNotifications(
  options: SyncNotificationsOptions = {},
): Promise<void> {
  const { full = false, setBadge = true } = options;

  const auth = await getStoredAuth();
  if (!auth.token) {
    if (setBadge) await chrome.action.setBadgeText({ text: '' });
    return;
  }

  try {
    const cached = await getCachedNotifications();
    const cachedItems = cached?.items ?? [];

    // Incremental unless forced, or there's nothing cached to merge onto.
    const cursor = full ? null : latestUpdatedAt(cachedItems);
    const since = cursor === null ? undefined : sinceFrom(cursor);
    const incremental = since !== undefined;

    const fetched = await listNotifications(auth.token, { all: false, since });

    // Merge deltas onto the cached set; a full fetch replaces it outright.
    const rawMerged = incremental
      ? mergeNotificationsById(cachedItems, fetched)
      : fetched;
    const prioritized = prioritizeAll(rawMerged);

    const cache: NotificationCache = { items: prioritized, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [NOTIFICATIONS_CACHE_KEY]: cache });

    // Detect new notifications by comparing the freshly-fetched threads against
    // the ids we last knew about.
    const previousCacheResult = await chrome.storage.local.get(NOTIFICATION_IDS_CACHE_KEY);
    const previousCache = previousCacheResult[NOTIFICATION_IDS_CACHE_KEY] as NotificationIdCache | undefined;
    const previousIds = new Set(previousCache?.ids ?? []);

    // Only send message if we have previous IDs (skip first sync)
    if (previousCache && previousIds.size > 0) {
      const newNotifications = fetched.filter((n) => !previousIds.has(n.id));

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

    // Store ids of the full merged set for next comparison
    await chrome.storage.local.set({
      [NOTIFICATION_IDS_CACHE_KEY]: {
        ids: prioritized.map((n) => n.id),
        lastSyncAt: Date.now(),
      } as NotificationIdCache,
    });

    if (setBadge) {
      const unreadCount = prioritized.filter((n) => n.unread).length;
      const badgeText = unreadCount > 0 ? String(Math.min(unreadCount, 99)) : '';
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
    }

    logger.info({
      module: MODULE,
      message: `Synced ${fetched.length} notifications (${incremental ? 'incremental' : 'full'}), ${prioritized.length} cached`,
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

    // Fetch the actionable counts in parallel. The notification count is taken
    // from the cache that `syncNotifications` maintains incrementally, so we
    // don't refetch the whole inbox here just to measure its size.
    const [prs, reviews, mentions] = await Promise.all([
      searchAssignedPrs(token, login),
      searchReviewRequested(token, login),
      searchMentions(token, login),
    ]);

    const notifCache = await getCachedNotifications();
    const notificationCount = notifCache?.items.filter((n) => n.unread).length ?? 0;

    const counts: CountsCache = {
      prs: prs.items.length,
      reviews: reviews.items.length,
      mentions: mentions.items.length,
      notifications: notificationCount,
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

/**
 * Run a full background refresh in the correct order: first the notification
 * sync (which populates the notification cache and, if enabled, plays sounds
 * for new items), then the badge/counts refresh which reads that cache. The
 * notification sync is told not to touch the badge so `syncAndUpdateBadge`
 * remains the sole badge writer.
 */
export async function syncAll(
  token: string,
  login: string,
  options: { full?: boolean } = {},
): Promise<void> {
  await syncNotifications({ full: options.full, setBadge: false });
  await syncAndUpdateBadge(token, login);
}
