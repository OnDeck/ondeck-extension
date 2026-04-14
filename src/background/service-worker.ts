// Background service worker.
// - Polls dashboard counts every 5 minutes (via chrome.alarms)
// - Updates the action badge with the aggregate unread / actionable count
// - Fires desktop notifications for new actionable threads (mentions,
//   review requests, assignments)
// - Skips polling when signed out and clears the badge on auth errors

import {
  fetchDashboardCounts,
  fetchNotifications,
  GitHubApiError,
  type NotificationThread,
} from '../lib/github-api';
import { getStoredAuth } from '../lib/auth';

const ALARM_NAME = 'gh-workflow-poll';
const SEEN_THREAD_KEY = 'gh_workflow_seen_threads_v1';
const ALARM_PERIOD_MINUTES = 5;
const SEEN_CACHE_LIMIT = 200;
const NOTIFY_THROTTLE = 3;

const ACTIONABLE_REASONS = new Set([
  'mention',
  'review_requested',
  'assign',
  'team_mention',
]);

async function getSeenThreads(): Promise<string[]> {
  const bag = await chrome.storage.local.get(SEEN_THREAD_KEY);
  return (bag[SEEN_THREAD_KEY] as string[] | undefined) ?? [];
}

async function setSeenThreads(ids: string[]): Promise<void> {
  // Keep the most recently-seen entries.
  const trimmed = ids.slice(-SEEN_CACHE_LIMIT);
  await chrome.storage.local.set({ [SEEN_THREAD_KEY]: trimmed });
}

async function clearBadge() {
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch {
    // ignore — popup might be reloading
  }
}

async function setBadgeCount(total: number) {
  if (!total) {
    await clearBadge();
    return;
  }
  const text = total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeBackgroundColor({ color: '#1f6feb' });
  await chrome.action.setBadgeText({ text });
}

function notifyForThread(thread: NotificationThread) {
  const id = `gh-workflow:${thread.id}`;
  chrome.notifications
    .create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: `${thread.repository.full_name} · ${thread.reason.replace('_', ' ')}`,
      message: thread.subject.title,
      priority: 1,
    })
    .catch(() => {
      /* notifications permission may be denied */
    });
}

async function refresh(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await clearBadge();
    return;
  }
  try {
    const [counts, threads] = await Promise.all([
      fetchDashboardCounts(token, viewer.login),
      fetchNotifications(token, { all: false, perPage: 50 }),
    ]);
    const total =
      counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.unreadNotifications;
    await setBadgeCount(total);

    const seen = new Set(await getSeenThreads());
    const fresh: NotificationThread[] = [];
    for (const thread of threads) {
      if (ACTIONABLE_REASONS.has(thread.reason) && !seen.has(thread.id)) {
        fresh.push(thread);
      }
    }
    fresh.slice(0, NOTIFY_THROTTLE).forEach(notifyForThread);

    const allIds = [...seen, ...threads.map((t) => t.id)];
    await setSeenThreads(Array.from(new Set(allIds)));
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      await clearBadge();
    }
    // Other errors leave the previous badge state intact until the next tick.
  }
}

function ensureAlarm() {
  chrome.alarms.get(ALARM_NAME, (existing) => {
    if (!existing) {
      chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: ALARM_PERIOD_MINUTES,
        delayInMinutes: 0.1,
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
  ensureAlarm();
  void refresh();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  void refresh();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void refresh();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'workflow:refresh') {
    void refresh();
  }
  if (message?.type === 'workflow:signed-out') {
    void clearBadge();
  }
});

chrome.notifications.onClicked.addListener((id) => {
  if (!id.startsWith('gh-workflow:')) return;
  chrome.tabs.create({ url: 'https://github.com/notifications' });
  chrome.notifications.clear(id);
});

ensureAlarm();
void refresh();

export {};
