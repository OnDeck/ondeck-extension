// Background service worker.
//
// - Polls GitHub on a chrome.alarms cadence to keep the action badge in sync
//   with the most actionable count (reviews > assigned > mentions > inbox).
// - Fires chrome.notifications for newly seen mention / review / assign threads,
//   deduped via chrome.storage.local.
// - Pauses cleanly when the user is signed out.

import { getStoredAuth } from '../lib/auth';
import {
  fetchDashboardCounts,
  fetchNotifications,
  notificationHtmlUrl,
  type NotificationItem,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_PERIOD_MIN = 5;
const SEEN_THREADS_KEY = 'gh_workflow_seen_threads_v1';
const NOTIFY_REASONS = new Set(['mention', 'review_requested', 'assign']);
const MAX_NEW_NOTIFICATIONS = 3;

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  void poll();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void poll();
  }
});

// React immediately to sign-in / sign-out so the badge clears or refreshes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'gh_workflow_token_v1' in changes) {
    void poll();
  }
});

if (typeof chrome !== 'undefined' && chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener((id) => {
    void chrome.tabs?.create({ url: 'https://github.com/notifications' });
    void chrome.notifications.clear(id);
  });
}

function ensureAlarm(): void {
  chrome.alarms.get(ALARM_NAME, (existing) => {
    if (!existing) {
      chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: POLL_PERIOD_MIN,
        delayInMinutes: 0.1,
      });
    }
  });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

async function setBadge(count: number, urgent: boolean): Promise<void> {
  if (count <= 0) {
    await clearBadge();
    return;
  }
  await chrome.action.setBadgeBackgroundColor({
    color: urgent ? '#f85149' : '#1f6feb',
  });
  await chrome.action.setBadgeText({
    text: count > 99 ? '99+' : String(count),
  });
}

async function poll(): Promise<void> {
  try {
    const { token, viewer } = await getStoredAuth();
    if (!token || !viewer) {
      await clearBadge();
      return;
    }
    const counts = await fetchDashboardCounts(viewer.login, token);
    const total =
      counts.reviewRequests +
      counts.assignedPrs +
      counts.mentions +
      counts.unreadNotifications;
    const urgent = counts.reviewRequests > 0 || counts.mentions > 0;
    await setBadge(total, urgent);

    // Surface new notifications via desktop toasts.
    const notifications = await fetchNotifications(token);
    await dispatchNew(notifications);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

interface SeenStore {
  ids: string[];
}

async function dispatchNew(items: NotificationItem[]): Promise<void> {
  const bag = await chrome.storage.local.get(SEEN_THREADS_KEY);
  const stored = (bag[SEEN_THREADS_KEY] as SeenStore | undefined) ?? { ids: [] };
  const seen = new Set(stored.ids);

  const fresh = items.filter(
    (item) => NOTIFY_REASONS.has(item.reason) && !seen.has(item.id),
  );

  for (const item of fresh.slice(0, MAX_NEW_NOTIFICATIONS)) {
    try {
      await chrome.notifications.create(`gh-${item.id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${item.repository.full_name}`,
        message: `${item.reason}: ${item.subject.title}`,
        contextMessage: notificationHtmlUrl(item),
      });
    } catch {
      // ignore notification dispatch failures
    }
  }

  // Persist a bounded list of seen ids (keep newest 200).
  const nextIds = Array.from(new Set([...items.map((i) => i.id), ...stored.ids])).slice(
    0,
    200,
  );
  await chrome.storage.local.set({ [SEEN_THREADS_KEY]: { ids: nextIds } satisfies SeenStore });
}

export {};
