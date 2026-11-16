import { getStoredAuth } from '../../lib/auth';
import { listNotifications, type NotificationItem } from '../../lib/github-api';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import {
  mergeNotificationsById,
  latestUpdatedAt,
  sinceFrom,
} from '../../shared/notifications/merge';
import { showDesktopNotifications } from './desktop-notifications';
import {
  readNotificationCache,
  writeNotificationCache,
  type NotificationCache,
} from '../../shared/notifications/cache';
import { NOTIFICATION_SEEN_CACHE_KEY, BADGE_COLOR_DEFAULT } from '../../shared/constants';
import { logger } from '../../shared/logger';
import type { NewNotificationMessage } from '../../shared/types/notifications';
import { getSettings } from '../../lib/settings';

const MODULE = 'sync-worker';

// Incremental fetches can't see threads read elsewhere (they drop out of the
// unread set without a new updated_at), so reconcile with a full fetch at
// least this often to keep the badge honest.
const FULL_RECONCILE_MS = 30 * 60 * 1000;

interface SeenCache {
  keys: string[];
  lastSyncAt: number;
}

interface SyncNotificationsOptions {
  /**
   * Fetch the whole unread inbox instead of only what changed since the last
   * sync. Use at reconciliation points (startup, sign-in, settings change,
   * after a mark-as-read) so threads read elsewhere are pruned.
   */
  full?: boolean;
}

// Thread ids are reused, so keying on id alone misses new activity on a thread
// that was already unread at the previous sync.
function seenKey(n: NotificationItem): string {
  return `${n.id}:${n.updated_at}`;
}

/**
 * The single sync path for every trigger. Incremental by default: fetches only
 * threads updated since the newest cached one (GitHub's `since`) and merges
 * them onto the cache. Alerts on anything new and sets the badge to the unread
 * count, so it always matches what the popup shows.
 */
export async function syncNotifications(options: SyncNotificationsOptions = {}): Promise<void> {
  const auth = await getStoredAuth();
  if (!auth.token) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  try {
    const cached = await readNotificationCache();
    const cachedItems = cached?.items ?? [];
    const reconcileDue = Date.now() - (cached?.lastFullSyncAt ?? 0) > FULL_RECONCILE_MS;

    const cursor = options.full || reconcileDue ? null : latestUpdatedAt(cachedItems);
    const since = cursor === null ? undefined : sinceFrom(cursor);
    const incremental = since !== undefined;

    const fetched = await listNotifications(auth.token, { all: false, since });
    const merged = incremental ? mergeNotificationsById(cachedItems, fetched) : fetched;
    const prioritized = prioritizeAll(merged);

    const cache: NotificationCache = {
      items: prioritized,
      fetchedAt: Date.now(),
      lastFullSyncAt: incremental ? cached?.lastFullSyncAt : Date.now(),
    };
    await writeNotificationCache(cache);

    await announceNewNotifications(fetched, prioritized);
    await setUnreadBadge(prioritized.filter((n) => n.unread).length);

    logger.info({
      module: MODULE,
      message: `Synced ${fetched.length} notifications (${incremental ? 'incremental' : 'full'}), ${prioritized.length} cached`,
    });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Sync failed', error });
  }
}

async function announceNewNotifications(
  fetched: NotificationItem[],
  current: NotificationItem[],
): Promise<void> {
  const bag = await chrome.storage.local.get(NOTIFICATION_SEEN_CACHE_KEY);
  const previous = bag[NOTIFICATION_SEEN_CACHE_KEY] as SeenCache | undefined;

  const next: SeenCache = { keys: current.map(seenKey), lastSyncAt: Date.now() };
  await chrome.storage.local.set({ [NOTIFICATION_SEEN_CACHE_KEY]: next });

  // First sync after install or sign-in records a baseline rather than
  // alerting on the whole backlog. An empty previous list is still a baseline.
  if (!previous) return;

  const seen = new Set(previous.keys);
  const fresh = fetched.filter((n) => !seen.has(seenKey(n)));
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
