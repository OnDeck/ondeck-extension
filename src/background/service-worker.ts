// Background service worker — keeps the extension badge in sync with the
// user's review/mention/assignment counts and fires desktop notifications
// for newly surfaced threads. No GitHub traffic when logged out.

import { TOKEN_STORAGE_KEY, getStoredAuth } from '../lib/auth';
import { fetchDashboardCounts } from '../lib/counts';
import { fetchNotifications, notificationHtmlUrl } from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_MINUTES = 5;
const SEEN_KEY = 'gh_workflow_seen_threads_v1';
const MAX_NOTIFICATIONS_PER_POLL = 3;
const URGENT_REASONS = new Set(['mention', 'review_requested', 'assign']);

async function setBadge(total: number, urgent: boolean): Promise<void> {
  if (total <= 0) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }
  const text = total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: urgent ? '#f85149' : '#1f6feb',
  });
}

async function loadSeenThreads(): Promise<Set<string>> {
  const bag = await chrome.storage.local.get(SEEN_KEY);
  const stored = bag[SEEN_KEY];
  return new Set(Array.isArray(stored) ? (stored as string[]) : []);
}

async function saveSeenThreads(ids: Set<string>): Promise<void> {
  // Bound the set so it doesn't grow forever.
  const trimmed = Array.from(ids).slice(-500);
  await chrome.storage.local.set({ [SEEN_KEY]: trimmed });
}

async function maybeNotify(token: string, firstRun: boolean): Promise<void> {
  const notifs = await fetchNotifications(token).catch(() => []);
  const seen = await loadSeenThreads();
  const fresh = notifs.filter((n) => !seen.has(n.id) && URGENT_REASONS.has(n.reason));

  for (const n of notifs) {
    seen.add(n.id);
  }
  await saveSeenThreads(seen);

  // Don't flood the user on first boot — seed the set but stay quiet.
  if (firstRun) return;

  for (const notif of fresh.slice(0, MAX_NOTIFICATIONS_PER_POLL)) {
    chrome.notifications.create(`gh-${notif.id}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: notif.repository.full_name,
      message: notif.subject.title,
      priority: 1,
    });
  }
}

async function poll(firstRun = false): Promise<void> {
  const auth = await getStoredAuth();
  if (!auth.token || !auth.viewer) {
    await setBadge(0, false);
    return;
  }
  try {
    const counts = await fetchDashboardCounts(auth.token, auth.viewer.login);
    const urgent = counts.reviewRequests > 0 || counts.mentions > 0;
    const total =
      counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.notifications;
    await setBadge(total, urgent);
    await maybeNotify(auth.token, firstRun);
  } catch {
    // Leave the previous badge alone on errors.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_MINUTES });
  void poll(true);
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_MINUTES });
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void poll();
  }
});

// Re-poll immediately when auth changes (sign-in / sign-out).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && TOKEN_STORAGE_KEY in changes) {
    void poll();
  }
});

// Clicking a desktop notification jumps to the GitHub inbox or the
// underlying subject URL when we can rebuild it.
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith('gh-')) return;
  const threadId = notificationId.slice(3);
  try {
    const auth = await getStoredAuth();
    if (!auth.token) {
      await chrome.tabs.create({ url: 'https://github.com/notifications' });
      return;
    }
    const notifs = await fetchNotifications(auth.token);
    const match = notifs.find((n) => n.id === threadId);
    const url = match ? notificationHtmlUrl(match) : 'https://github.com/notifications';
    await chrome.tabs.create({ url });
  } catch {
    await chrome.tabs.create({ url: 'https://github.com/notifications' });
  } finally {
    chrome.notifications.clear(notificationId);
  }
});

export {};
