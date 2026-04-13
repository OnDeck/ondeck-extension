// Background service worker.
//
// Responsibilities:
//   - Periodically poll GitHub for unread activity (mentions, review requests,
//     assignments, notifications) and update the toolbar badge.
//   - Fire desktop notifications when a new mention/assignment/review request
//     arrives that the user has not seen before.
//   - Stop polling entirely while the user is signed out.
//
// All polling is gated on the presence of a stored token. We never call out
// to GitHub when chrome.storage.sync has no token persisted.

import { getStoredAuth } from '../lib/auth';
import {
  fetchNotifications,
  GitHubApiError,
  type NotificationItem,
} from '../lib/github-api';

const POLL_ALARM = 'gh-workflow-poll';
const SEEN_THREADS_KEY = 'gh_workflow_seen_threads_v1';
const POLL_PERIOD_MINUTES = 5;
const BADGE_COLOR_DEFAULT = '#1f6feb';
const BADGE_COLOR_ATTENTION = '#f85149';

interface SeenState {
  ids: string[];
}

async function getSeenIds(): Promise<Set<string>> {
  const bag = await chrome.storage.local.get(SEEN_THREADS_KEY);
  const stored = bag[SEEN_THREADS_KEY] as SeenState | undefined;
  return new Set(stored?.ids ?? []);
}

async function setSeenIds(ids: Set<string>): Promise<void> {
  // Cap the history we remember so it does not grow unbounded.
  const trimmed = Array.from(ids).slice(-500);
  await chrome.storage.local.set({
    [SEEN_THREADS_KEY]: { ids: trimmed } satisfies SeenState,
  });
}

async function clearSeenIds(): Promise<void> {
  await chrome.storage.local.remove(SEEN_THREADS_KEY);
}

function badgeText(count: number): string {
  if (count <= 0) return '';
  if (count > 99) return '99+';
  return String(count);
}

async function setBadge(count: number): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? BADGE_COLOR_ATTENTION : BADGE_COLOR_DEFAULT,
  });
  await chrome.action.setBadgeText({ text: badgeText(count) });
}

const ATTENTION_REASONS = new Set([
  'assign',
  'mention',
  'review_requested',
  'team_mention',
]);

function isAttentionWorthy(item: NotificationItem): boolean {
  return ATTENTION_REASONS.has(item.reason);
}

function notificationTitle(item: NotificationItem): string {
  switch (item.reason) {
    case 'assign':
      return `Assigned in ${item.repository.full_name}`;
    case 'mention':
      return `Mentioned in ${item.repository.full_name}`;
    case 'review_requested':
      return `Review requested in ${item.repository.full_name}`;
    case 'team_mention':
      return `Team mention in ${item.repository.full_name}`;
    default:
      return item.repository.full_name;
  }
}

async function fireDesktopNotification(item: NotificationItem): Promise<void> {
  try {
    await chrome.notifications.create(`gh-${item.id}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: notificationTitle(item),
      message: item.subject.title.slice(0, 160),
      priority: 1,
    });
  } catch (err) {
    console.warn('[gh-workflow] notification failed', err);
  }
}

async function poll(): Promise<void> {
  const { token } = await getStoredAuth();
  if (!token) {
    // Signed out — clear badge and stop the alarm so we don't burn rate limit.
    await setBadge(0);
    await chrome.alarms.clear(POLL_ALARM);
    await clearSeenIds();
    return;
  }
  let items: NotificationItem[];
  try {
    items = await fetchNotifications(token);
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      await setBadge(0);
      await chrome.alarms.clear(POLL_ALARM);
      return;
    }
    console.warn('[gh-workflow] poll failed', err);
    return;
  }
  await setBadge(items.length);

  const seen = await getSeenIds();
  const next = new Set(seen);
  const fresh: NotificationItem[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      next.add(item.id);
      if (isAttentionWorthy(item)) fresh.push(item);
    }
  }
  // Drop ids that are no longer pending so the cap never wastes space on
  // long-since-read threads.
  const stillPending = new Set(items.map((i) => i.id));
  for (const id of next) {
    if (!stillPending.has(id) && !seen.has(id)) {
      next.delete(id);
    }
  }
  await setSeenIds(next);

  // Cap notifications fired per poll so a backlog doesn't spam the user.
  for (const item of fresh.slice(0, 3)) {
    await fireDesktopNotification(item);
  }
}

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(POLL_ALARM);
  if (!existing) {
    await chrome.alarms.create(POLL_ALARM, {
      periodInMinutes: POLL_PERIOD_MINUTES,
      delayInMinutes: 0.1,
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureAlarm();
  void poll();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) {
    void poll();
  }
});

// React immediately when the popup signs in/out so the badge updates without
// waiting for the next 5-minute tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'gh_workflow_token_v1' in changes) {
    void poll();
  }
});

// Clicking a desktop notification opens GitHub's notifications inbox.
chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith('gh-')) return;
  void chrome.tabs.create({ url: 'https://github.com/notifications' });
  void chrome.notifications.clear(notificationId);
});

export {};
