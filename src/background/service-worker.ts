// Background service worker. Polls the GitHub API on a chrome.alarms
// schedule, keeps the extension badge count in sync with the number of
// unread notifications / actionable items, and fires a desktop
// notification when something new lands in the viewer's inbox.

import { getStoredAuth } from '../lib/auth';
import {
  fetchDashboardCounts,
  fetchUnreadNotifications,
  GitHubApiError,
  type DashboardCounts,
  type GitHubNotification,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const SEEN_IDS_KEY = 'gh_workflow_seen_notification_ids_v1';
const LAST_COUNTS_KEY = 'gh_workflow_last_counts_v1';

interface SeenIdsState {
  ids: string[];
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
  void schedule();
  void poll();
});

chrome.runtime.onStartup.addListener(() => {
  void schedule();
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void poll();
});

// When the popup signs in / out we mirror that as a storage change,
// so react to it here and either resume polling or clear the badge.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if ('gh_workflow_token_v1' in changes) {
    if (changes.gh_workflow_token_v1.newValue) {
      void schedule();
      void poll();
    } else {
      void clearBadge();
      void chrome.alarms.clear(ALARM_NAME);
    }
  }
});

async function schedule(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing) return;
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: POLL_PERIOD_MINUTES,
    delayInMinutes: 1,
  });
}

async function poll(): Promise<void> {
  try {
    const { token, viewer } = await getStoredAuth();
    if (!token || !viewer) {
      await clearBadge();
      return;
    }
    const [counts, notifications] = await Promise.all([
      fetchDashboardCounts(token, viewer.login).catch(() => null),
      fetchUnreadNotifications(token).catch(() => [] as GitHubNotification[]),
    ]);

    if (counts) {
      await applyBadge(counts);
      await chrome.storage.local.set({ [LAST_COUNTS_KEY]: counts });
    }
    await dispatchNewNotifications(notifications);
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      await clearBadge();
    }
    console.warn('[gh-workflow] poll failed', err);
  }
}

/**
 * Applies a badge reflecting the most-actionable count. Review
 * requests take priority (they block the team), then assigned PRs,
 * then mentions, then raw notifications. The badge colour cues the
 * urgency: red for review blockers, blue for everything else.
 */
async function applyBadge(counts: DashboardCounts): Promise<void> {
  const { reviewRequests, assignedPrs, mentions, notifications } = counts;
  let count = 0;
  let color = '#1f6feb';
  if (reviewRequests > 0) {
    count = reviewRequests;
    color = '#f85149';
  } else if (assignedPrs > 0) {
    count = assignedPrs;
    color = '#1f6feb';
  } else if (mentions > 0) {
    count = mentions;
    color = '#8250df';
  } else {
    count = notifications;
    color = '#6e7781';
  }
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text: count > 0 ? String(count > 99 ? '99+' : count) : '' });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

/**
 * Compare the freshly-fetched notifications against the last-seen set
 * in chrome.storage.local. Anything new with an "actionable" reason
 * (mention, review_requested, assign) fires a desktop notification.
 */
async function dispatchNewNotifications(
  notifications: GitHubNotification[],
): Promise<void> {
  const bag = (await chrome.storage.local.get(SEEN_IDS_KEY)) as Record<string, SeenIdsState>;
  const previous = new Set(bag[SEEN_IDS_KEY]?.ids ?? []);
  const currentIds = notifications.map((n) => n.id);
  const actionableReasons = new Set(['mention', 'review_requested', 'assign']);
  const newActionable = notifications.filter(
    (n) => !previous.has(n.id) && actionableReasons.has(n.reason),
  );

  // Cap to 3 desktop notifications per poll so we never flood the user.
  for (const notification of newActionable.slice(0, 3)) {
    const title =
      notification.reason === 'review_requested'
        ? 'Review requested'
        : notification.reason === 'mention'
          ? 'You were mentioned'
          : 'PR assigned to you';
    await chrome.notifications.create(`gh-workflow-${notification.id}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message: `${notification.repoFullName} — ${notification.title}`,
      priority: 1,
    });
  }

  // Keep only current + newest 200 historic ids so storage doesn't grow
  // unbounded on noisy inboxes.
  const retained = Array.from(new Set([...currentIds, ...previous])).slice(0, 200);
  await chrome.storage.local.set({ [SEEN_IDS_KEY]: { ids: retained } satisfies SeenIdsState });
}

// Click a desktop notification -> open the browser inbox.
chrome.notifications.onClicked.addListener(async (notificationId) => {
  await chrome.notifications.clear(notificationId);
  await chrome.tabs.create({ url: 'https://github.com/notifications' });
});

export {};
