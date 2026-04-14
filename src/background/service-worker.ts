// Background service worker: keeps the extension badge in sync with the
// user's unread / actionable counts and surfaces OS notifications when new
// actionable items arrive. Uses chrome.alarms so the worker can wake up on
// its own schedule instead of only running while the popup is open.

import { getStoredAuth } from '../lib/auth';
import {
  fetchNotifications,
  GitHubApiError,
  searchIssuesCount,
  SEARCH_QUERIES,
  type NotificationThread,
} from '../lib/github-api';

const REFRESH_ALARM = 'gh-workflow-refresh';
const REFRESH_PERIOD_MIN = 5;
const SEEN_THREADS_KEY = 'gh_workflow_seen_threads_v1';
const LAST_COUNTS_KEY = 'gh_workflow_last_counts_v1';

interface LastCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
  total: number;
  updatedAt: number;
}

interface SeenThreads {
  ids: string[];
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, {
    delayInMinutes: 0.1,
    periodInMinutes: REFRESH_PERIOD_MIN,
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, {
    delayInMinutes: 0.1,
    periodInMinutes: REFRESH_PERIOD_MIN,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
  void refreshWorkflow();
});

// Allow the popup to request a refresh on demand (e.g. after sign-in
// or an explicit pull-to-refresh).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'workflow:refresh') {
    refreshWorkflow()
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Refresh failed',
        }),
      );
    return true; // keep the channel open for the async response
  }
  if (msg && msg.type === 'workflow:signed-out') {
    // Another account may still be active after a partial sign-out, so
    // trigger a refresh instead of unconditionally clearing the badge.
    void refreshWorkflow().catch(() => resetBadge());
    return false;
  }
  return false;
});

async function refreshWorkflow(): Promise<{ total: number }> {
  const { token } = await getStoredAuth();
  if (!token) {
    await resetBadge();
    return { total: 0 };
  }
  try {
    const [assignedPrs, reviewRequests, mentions, notifications] = await Promise.all([
      searchIssuesCount(token, SEARCH_QUERIES.assignedPrs),
      searchIssuesCount(token, SEARCH_QUERIES.reviewRequests),
      searchIssuesCount(token, SEARCH_QUERIES.mentions),
      fetchNotifications(token),
    ]);
    const total = assignedPrs + reviewRequests + mentions + notifications.length;
    await updateBadge(total);
    await dispatchNewThreadNotifications(notifications);
    const counts: LastCounts = {
      assignedPrs,
      reviewRequests,
      mentions,
      notifications: notifications.length,
      total,
      updatedAt: Date.now(),
    };
    await chrome.storage.local.set({ [LAST_COUNTS_KEY]: counts });
    return { total };
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      await resetBadge();
    }
    throw err;
  }
}

async function updateBadge(total: number): Promise<void> {
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#1f6feb' });
}

async function resetBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

async function dispatchNewThreadNotifications(
  threads: NotificationThread[],
): Promise<void> {
  const bag = await chrome.storage.local.get(SEEN_THREADS_KEY);
  const prev = (bag[SEEN_THREADS_KEY] as SeenThreads | undefined) ?? { ids: [] };
  const prevSet = new Set(prev.ids);
  const ACTIONABLE = new Set(['mention', 'review_requested', 'assign', 'team_mention']);
  const newOnes = threads.filter(
    (t) => !prevSet.has(t.id) && ACTIONABLE.has(t.reason),
  );
  for (const thread of newOnes.slice(0, 3)) {
    try {
      await chrome.notifications.create(`gh-${thread.id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${thread.repository.full_name} · ${thread.reason.replace('_', ' ')}`,
        message: thread.subject.title.slice(0, 180),
        priority: 1,
      });
    } catch {
      // Notifications can be denied / unavailable; skip silently.
    }
  }
  // Store up to 200 seen ids so the list doesn't grow unbounded.
  const nextIds = Array.from(new Set([...threads.map((t) => t.id), ...prev.ids])).slice(
    0,
    200,
  );
  await chrome.storage.local.set({ [SEEN_THREADS_KEY]: { ids: nextIds } });
}

export {};
