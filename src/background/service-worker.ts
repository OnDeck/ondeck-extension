// Background service worker: keeps the extension badge in sync with the
// number of actionable items (unread notifications + review requests) and
// surfaces system notifications for new mentions or assignments.
//
// Uses chrome.alarms for periodic polling so the SW can shut down between
// fires. Respects auth state — polling halts while the user is signed out.

import { getStoredAuth } from '../lib/auth';
import {
  fetchUnreadNotifications,
  GitHubApiError,
  type NotificationThread,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const SEEN_IDS_KEY = 'gh_workflow_seen_thread_ids_v1';
const LAST_BADGE_KEY = 'gh_workflow_last_badge_v1';

const BADGE_COLOR_ACTIONABLE = '#1f6feb';
const BADGE_COLOR_EMPTY = '#30363d';

const NOTIFY_REASONS: ReadonlySet<string> = new Set([
  'mention',
  'team_mention',
  'assign',
  'review_requested',
]);

async function setBadge(count: number): Promise<void> {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? BADGE_COLOR_ACTIONABLE : BADGE_COLOR_EMPTY,
  });
  await chrome.storage.local.set({ [LAST_BADGE_KEY]: count });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
  await chrome.storage.local.set({ [LAST_BADGE_KEY]: 0 });
}

async function getSeenIds(): Promise<Set<string>> {
  const bag = await chrome.storage.local.get(SEEN_IDS_KEY);
  const arr = bag[SEEN_IDS_KEY] as string[] | undefined;
  return new Set(arr ?? []);
}

async function saveSeenIds(ids: Set<string>): Promise<void> {
  // Cap at 500 to prevent unbounded growth; recent entries win.
  const arr = Array.from(ids).slice(-500);
  await chrome.storage.local.set({ [SEEN_IDS_KEY]: arr });
}

function notificationTitle(thread: NotificationThread): string {
  switch (thread.reason) {
    case 'mention':
    case 'team_mention':
      return `Mentioned in ${thread.repository.full_name}`;
    case 'assign':
      return `Assigned in ${thread.repository.full_name}`;
    case 'review_requested':
      return `Review requested in ${thread.repository.full_name}`;
    default:
      return thread.repository.full_name;
  }
}

async function fireSystemNotification(thread: NotificationThread): Promise<void> {
  try {
    await chrome.notifications.create(`gh-${thread.id}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: notificationTitle(thread),
      message: thread.subject.title,
      contextMessage: thread.subject.type,
      priority: 1,
    });
  } catch (err) {
    console.warn('[gh-workflow] notification create failed', err);
  }
}

async function poll(): Promise<void> {
  const { token } = await getStoredAuth();
  if (!token) {
    await clearBadge();
    return;
  }

  let threads: NotificationThread[];
  try {
    threads = await fetchUnreadNotifications(token);
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      // Token went stale; stop polling until re-auth.
      await clearBadge();
      return;
    }
    console.warn('[gh-workflow] poll failed', err);
    return;
  }

  await setBadge(threads.length);

  const seen = await getSeenIds();
  const fresh = threads.filter((t) => !seen.has(t.id) && NOTIFY_REASONS.has(t.reason));
  for (const thread of fresh) {
    await fireSystemNotification(thread);
    seen.add(thread.id);
  }
  // Record all current ids as "seen" so we don't re-notify on next tick.
  for (const thread of threads) {
    seen.add(thread.id);
  }
  await saveSeenIds(seen);
}

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: POLL_PERIOD_MINUTES,
      delayInMinutes: 0.1,
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
  void ensureAlarm();
  void poll();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void poll();
  }
});

// React immediately when auth state changes in chrome.storage.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'gh_workflow_token_v1' in changes) {
    void poll();
  }
});

// Clicking a system notification opens GitHub's notification inbox.
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('gh-')) {
    void chrome.tabs.create({ url: 'https://github.com/notifications' });
  }
});

export {};
