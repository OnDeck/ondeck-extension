// Background service worker: polls the GitHub API on a schedule, keeps the
// extension badge in sync with actionable counts, and fires desktop
// notifications for new mentions / review requests / assignments.

import { getStoredAuth, TOKEN_STORAGE_KEY } from '../lib/auth';
import {
  fetchDashboardCounts,
  fetchNotifications,
  notificationHtmlUrl,
  type NotificationThread,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const SEEN_THREADS_KEY = 'gh_workflow_seen_threads_v1';
const NOTIFICATION_META_KEY = 'gh_workflow_notification_meta_v1';
const MAX_DESKTOP_NOTIFICATIONS_PER_TICK = 3;
const ACTIONABLE_REASONS = new Set(['mention', 'review_requested', 'assign']);

interface NotificationMeta {
  [chromeNotificationId: string]: string; // url to open on click
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

async function setBadge(counts: {
  reviewRequested: number;
  mentions: number;
  notifications: number;
}): Promise<void> {
  const actionable = counts.reviewRequested + counts.mentions;
  const text =
    actionable > 0
      ? String(Math.min(actionable, 99))
      : counts.notifications > 0
        ? String(Math.min(counts.notifications, 99))
        : '';
  await chrome.action.setBadgeBackgroundColor({
    color: actionable > 0 ? '#f85149' : '#1f6feb',
  });
  await chrome.action.setBadgeText({ text });
}

async function getSeenThreadIds(): Promise<Set<string>> {
  const bag = await chrome.storage.local.get(SEEN_THREADS_KEY);
  const list = (bag[SEEN_THREADS_KEY] as string[] | undefined) ?? [];
  return new Set(list);
}

async function saveSeenThreadIds(ids: Set<string>): Promise<void> {
  // Cap the set so chrome.storage.local doesn't grow without bound.
  const trimmed = Array.from(ids).slice(-500);
  await chrome.storage.local.set({ [SEEN_THREADS_KEY]: trimmed });
}

async function getNotificationMeta(): Promise<NotificationMeta> {
  const bag = await chrome.storage.local.get(NOTIFICATION_META_KEY);
  return (bag[NOTIFICATION_META_KEY] as NotificationMeta | undefined) ?? {};
}

async function rememberNotification(id: string, url: string): Promise<void> {
  const meta = await getNotificationMeta();
  meta[id] = url;
  await chrome.storage.local.set({ [NOTIFICATION_META_KEY]: meta });
}

async function forgetNotification(id: string): Promise<void> {
  const meta = await getNotificationMeta();
  delete meta[id];
  await chrome.storage.local.set({ [NOTIFICATION_META_KEY]: meta });
}

async function fireDesktopNotifications(
  threads: NotificationThread[],
  firstRun: boolean,
): Promise<void> {
  const seen = await getSeenThreadIds();
  const actionable = threads.filter((t) => ACTIONABLE_REASONS.has(t.reason));
  const fresh = actionable.filter((t) => !seen.has(t.id));

  // Seed the "seen" set silently on first run so we don't spam users with
  // their entire existing backlog.
  if (firstRun) {
    for (const t of actionable) seen.add(t.id);
    await saveSeenThreadIds(seen);
    return;
  }

  let fired = 0;
  for (const thread of fresh) {
    if (fired >= MAX_DESKTOP_NOTIFICATIONS_PER_TICK) break;
    try {
      const chromeId = `gh-thread-${thread.id}`;
      const url = notificationHtmlUrl(thread);
      await chrome.notifications.create(chromeId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: `${thread.repository.full_name}`,
        message: thread.subject.title,
        contextMessage: `Reason: ${thread.reason}`,
        priority: 1,
      });
      await rememberNotification(chromeId, url);
      fired++;
    } catch {
      // Ignore per-notification failures.
    }
    seen.add(thread.id);
  }
  // Mark the rest as seen too so we don't re-fire later.
  for (const t of fresh) seen.add(t.id);
  await saveSeenThreadIds(seen);
}

async function poll(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await clearBadge();
    return;
  }
  try {
    const [counts, threads] = await Promise.all([
      fetchDashboardCounts(token, viewer.login),
      fetchNotifications(token),
    ]);
    await setBadge(counts);
    const firstRunBag = await chrome.storage.local.get(SEEN_THREADS_KEY);
    const firstRun = !(SEEN_THREADS_KEY in firstRunBag);
    await fireDesktopNotifications(threads, firstRun);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

function schedule(): void {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: POLL_PERIOD_MINUTES,
    delayInMinutes: 0.1,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
  schedule();
  void poll();
});

chrome.runtime.onStartup.addListener(() => {
  schedule();
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void poll();
});

// Re-poll immediately whenever the user signs in or out so the badge is
// responsive even between alarms.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (TOKEN_STORAGE_KEY in changes) {
    void poll();
  }
});

chrome.notifications.onClicked.addListener((id) => {
  void (async () => {
    const meta = await getNotificationMeta();
    const url = meta[id];
    if (url) {
      await chrome.tabs.create({ url });
    } else {
      await chrome.tabs.create({ url: 'https://github.com/notifications' });
    }
    await chrome.notifications.clear(id);
    await forgetNotification(id);
  })();
});

chrome.notifications.onClosed.addListener((id) => {
  void forgetNotification(id);
});

export {};
