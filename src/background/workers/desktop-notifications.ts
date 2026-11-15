import { notificationHtmlUrl, type NotificationItem } from '../../lib/github-api';
import type { UserSettings } from '../../shared/settings/types';
import { logger } from '../../shared/logger';

const MODULE = 'desktop-notifications';
const ID_PREFIX = 'ondeck|';

// The click target rides in the notification id so the click handler still
// works after Chrome has restarted the service worker (no in-memory map).
export function notificationIdFor(url: string): string {
  return `${ID_PREFIX}${crypto.randomUUID()}|${url}`;
}

export function urlFromNotificationId(id: string): string | null {
  if (!id.startsWith(ID_PREFIX)) return null;
  const url = id.slice(id.indexOf('|', ID_PREFIX.length) + 1);
  return url.startsWith('https://github.com/') ? url : null;
}

export function registerNotificationClickHandler(): void {
  chrome.notifications.onClicked.addListener((id) => {
    const url = urlFromNotificationId(id);
    if (!url) return;
    void chrome.tabs.create({ url });
    void chrome.notifications.clear(id);
  });
}

/**
 * Show desktop notification for new GitHub notifications
 */
export async function showDesktopNotifications(
  newNotifications: NotificationItem[],
  settings: UserSettings['notifications']
): Promise<void> {
  if (!settings.enabled || newNotifications.length === 0) {
    return;
  }

  // Filter by user-selected reasons
  const filtered = newNotifications.filter((n) =>
    (settings.reasons as readonly string[]).includes(n.reason)
  );

  if (filtered.length === 0) {
    logger.info({ module: MODULE, message: 'No notifications match user filter' });
    return;
  }

  // Group by repository for cleaner notifications
  const byRepo = new Map<string, NotificationItem[]>();
  for (const notification of filtered) {
    const repoName = notification.repository.full_name;
    if (!byRepo.has(repoName)) {
      byRepo.set(repoName, []);
    }
    byRepo.get(repoName)!.push(notification);
  }

  // Create one notification per repository
  for (const [repoName, notifications] of byRepo.entries()) {
    const count = notifications.length;
    const first = notifications[0];

    const title =
      count === 1
        ? first.subject.title
        : `${count} new notifications in ${repoName}`;

    const message =
      count === 1
        ? `${repoName} • ${formatReason(first.reason)}`
        : notifications
            .slice(0, 3)
            .map((n) => `• ${n.subject.title}`)
            .join('\n') + (count > 3 ? `\n• ...and ${count - 3} more` : '');

    const url =
      count === 1
        ? notificationHtmlUrl(first)
        : `https://github.com/notifications?query=${encodeURIComponent(`repo:${repoName}`)}`;

    await chrome.notifications.create(notificationIdFor(url), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: first.reason === 'security_alert' ? 2 : 1,
      requireInteraction: first.reason === 'security_alert',
      silent: !settings.sound,
    });

    logger.info({ module: MODULE, message: `Desktop notification shown for ${repoName}` });
  }
}

function formatReason(reason: string): string {
  switch (reason) {
    case 'assign':
      return 'Assigned to you';
    case 'mention':
      return 'You were mentioned';
    case 'review_requested':
      return 'Review requested';
    case 'team_mention':
      return 'Your team was mentioned';
    case 'security_alert':
      return 'Security alert';
    default:
      return reason.replace(/_/g, ' ');
  }
}
