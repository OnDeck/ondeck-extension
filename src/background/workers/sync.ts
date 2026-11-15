import { getStoredAuth } from '../../lib/auth';
import { listNotifications, type NotificationItem } from '../../lib/github-api';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { showDesktopNotifications } from './desktop-notifications';
import {
  NOTIFICATIONS_CACHE_KEY,
  NOTIFICATION_SEEN_CACHE_KEY,
  BADGE_COLOR_DEFAULT,
} from '../../shared/constants';
import { logger } from '../../shared/logger';
import type { NewNotificationMessage } from '../../shared/types/notifications';
import type { CountsCache, UserSettings } from '../../shared/settings/types';
import { getSettings } from '../../lib/settings';

const MODULE = 'sync-worker';

interface SeenCache {
  keys: string[];
  lastSyncAt: number;
}

export interface NotificationCache {
  items: ReturnType<typeof prioritizeAll>;
  fetchedAt: number;
}

// Thread ids are reused, so keying on id alone misses new activity on a thread
// that was already unread at the previous sync.
function seenKey(n: NotificationItem): string {
  return `${n.id}:${n.updated_at}`;
}

/**
 * The single sync path for every trigger (alarm, startup, popup request):
 * fetch unread notifications, alert on anything new, and set the badge to the
 * unread count so it always matches what the popup shows.
 */
export async function syncNotifications(): Promise<void> {
  const auth = await getStoredAuth();
  if (!auth.token) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  try {
    const raw = await listNotifications(auth.token, { all: false });

    const cache: NotificationCache = { items: prioritizeAll(raw), fetchedAt: Date.now() };
    await chrome.storage.local.set({ [NOTIFICATIONS_CACHE_KEY]: cache });

    await announceNewNotifications(raw);
    await setUnreadBadge(raw.filter((n) => n.unread).length);

    logger.info({ module: MODULE, message: `Synced ${raw.length} notifications` });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Sync failed', error });
  }
}

async function announceNewNotifications(current: NotificationItem[]): Promise<void> {
  const bag = await chrome.storage.local.get(NOTIFICATION_SEEN_CACHE_KEY);
  const previous = bag[NOTIFICATION_SEEN_CACHE_KEY] as SeenCache | undefined;

  const next: SeenCache = { keys: current.map(seenKey), lastSyncAt: Date.now() };
  await chrome.storage.local.set({ [NOTIFICATION_SEEN_CACHE_KEY]: next });

  // First sync after install or sign-in records a baseline rather than
  // alerting on the whole backlog. An empty previous list is still a baseline.
  if (!previous) return;

  const seen = new Set(previous.keys);
  const fresh = current.filter((n) => !seen.has(seenKey(n)));
  if (fresh.length === 0) return;

  const message: NewNotificationMessage = {
    type: 'NEW_NOTIFICATIONS',
    notifications: fresh.map((n) => ({ id: n.id, subjectType: n.subject.type })),
  };
  chrome.runtime.sendMessage(message).catch(() => {
    // No popup open to receive it.
  });

  const settings = await getSettings();
  await showDesktopNotifications(fresh, settings.notifications);
}

async function setUnreadBadge(unread: number): Promise<void> {
  const text = unread === 0 ? '' : unread > 99 ? '99+' : String(unread);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
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
