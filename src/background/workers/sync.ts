import { getStoredAuth } from '../../lib/auth';
import {
  listNotifications,
  searchAssignedPrs,
  searchMentions,
  searchReviewRequested,
} from '../../lib/github-api';
import { getSettings } from '../../lib/settings';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import {
  NOTIFICATIONS_CACHE_KEY,
  BADGE_COLOR_DEFAULT,
  BADGE_COLOR_CRITICAL,
} from '../../shared/constants';
import { logger } from '../../shared/logger';
import type { UserSettings, CountsCache } from '../../shared/settings/types';

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
    const prioritized = prioritizeAll(raw);

    const cache: NotificationCache = { items: prioritized, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [NOTIFICATIONS_CACHE_KEY]: cache });

    const unreadCount = raw.filter((n) => n.unread).length;
    const criticalCount = prioritized.filter(
      (n) => n.priority.level === 'critical',
    ).length;

    const badgeText = unreadCount > 0 ? String(Math.min(unreadCount, 99)) : '';
    const badgeColor = criticalCount > 0 ? BADGE_COLOR_CRITICAL : BADGE_COLOR_DEFAULT;

    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

    logger.info({
      module: MODULE,
      message: `Synced ${raw.length} notifications (${criticalCount} critical)`,
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
    if (badgeCount > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
    }

    logger.info({ module: MODULE, message: 'Sync completed' });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Sync failed', error });
    // Keep showing last cached counts on error
  }
}
