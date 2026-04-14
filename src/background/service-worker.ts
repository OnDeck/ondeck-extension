// Background service worker.
// Polls GitHub periodically via chrome.alarms, surfaces actionable counts on
// the action badge, and fires desktop notifications for new mentions and
// review requests. All polling is gated on the stored auth state.

import { getStoredAuth, TOKEN_STORAGE_KEY, VIEWER_STORAGE_KEY } from '../lib/auth';
import {
  fetchDashboardCounts,
  fetchNotifications,
  GitHubApiError,
  type NotificationItem,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-refresh';
const POLL_MINUTES = 5;
const SEEN_THREADS_KEY = 'gh_seen_thread_ids_v1';
const NOTIFY_REASONS = new Set([
  'mention',
  'team_mention',
  'review_requested',
  'assign',
]);

async function isSignedIn(): Promise<{ token: string; login: string } | null> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) return null;
  return { token, login: viewer.login };
}

async function getSeenThreads(): Promise<Record<string, number>> {
  const bag = await chrome.storage.local.get(SEEN_THREADS_KEY);
  return (bag[SEEN_THREADS_KEY] as Record<string, number> | undefined) ?? {};
}

async function setSeenThreads(seen: Record<string, number>): Promise<void> {
  await chrome.storage.local.set({ [SEEN_THREADS_KEY]: seen });
}

function badgeBackgroundFor(total: number): string {
  if (total === 0) return '#30363d';
  if (total >= 10) return '#f85149';
  return '#1f6feb';
}

async function updateBadge(total: number): Promise<void> {
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: badgeBackgroundFor(total) });
}

async function fireNotificationFor(item: NotificationItem): Promise<void> {
  try {
    await chrome.notifications.create(`gh-${item.id}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `${item.repository.full_name}: ${item.reason.replace('_', ' ')}`,
      message: item.subject.title,
      priority: 1,
    });
  } catch (err) {
    console.warn('[gh-workflow] notification failed', err);
  }
}

async function refresh(): Promise<void> {
  const session = await isSignedIn();
  if (!session) {
    await updateBadge(0);
    return;
  }
  try {
    const counts = await fetchDashboardCounts(session.token, session.login);
    const total = counts.assigned + counts.reviewRequested + counts.mentions + counts.notifications;
    await updateBadge(total);

    const notifications = await fetchNotifications(session.token);
    const seen = await getSeenThreads();
    const next: Record<string, number> = {};
    const firstRun = Object.keys(seen).length === 0;

    for (const item of notifications) {
      next[item.id] = Date.parse(item.updated_at);
      const previous = seen[item.id];
      const isNew = previous === undefined || previous < next[item.id];
      if (isNew && !firstRun && NOTIFY_REASONS.has(item.reason)) {
        await fireNotificationFor(item);
      }
    }
    await setSeenThreads(next);
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      await updateBadge(0);
    }
    console.warn('[gh-workflow] refresh failed', err);
  }
}

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: POLL_MINUTES,
      delayInMinutes: 0.1,
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureAlarm();
  void refresh();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
  void refresh();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void refresh();
});

// Re-run immediately on sign-in/out so the badge reacts without waiting
// for the next alarm tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (
    (area === 'sync' && changes[TOKEN_STORAGE_KEY]) ||
    (area === 'local' && changes[VIEWER_STORAGE_KEY])
  ) {
    void refresh();
  }
});

chrome.notifications.onClicked.addListener((id) => {
  if (id.startsWith('gh-')) {
    void chrome.tabs.create({ url: 'https://github.com/notifications' });
    void chrome.notifications.clear(id);
  }
});

// Warm start — best-effort initial refresh on worker wake.
void ensureAlarm();
void refresh();

export {};
