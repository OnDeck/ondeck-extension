// Background service worker: keeps the extension action badge in sync with
// actionable counts, fires desktop notifications for new mentions/assignments,
// and pauses polling when the user is signed out.

import { getStoredAuth } from '../lib/auth';
import { fetchDashboardCounts, type DashboardCounts } from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_MINUTES = 5;
const LAST_COUNTS_KEY = 'gh_workflow_last_counts_v1';
const NOTIFY_PREFIX = 'gh-workflow-notify';

const BADGE_COLOR_ACTIVE = '#1f6feb';
const BADGE_COLOR_EMPTY = '#30363d';

interface StoredLastCounts {
  assignedPrs: number;
  mentions: number;
  reviewRequests: number;
  notifications: number;
}

async function getLastCounts(): Promise<StoredLastCounts | null> {
  const bag = await chrome.storage.local.get(LAST_COUNTS_KEY);
  return (bag[LAST_COUNTS_KEY] as StoredLastCounts | undefined) ?? null;
}

async function setLastCounts(counts: StoredLastCounts): Promise<void> {
  await chrome.storage.local.set({ [LAST_COUNTS_KEY]: counts });
}

function badgeTotal(counts: DashboardCounts): number {
  return counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.notifications;
}

async function updateBadge(counts: DashboardCounts | null): Promise<void> {
  if (!counts) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }
  const total = badgeTotal(counts);
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: total > 0 ? BADGE_COLOR_ACTIVE : BADGE_COLOR_EMPTY,
  });
}

function notify(id: string, title: string, message: string): void {
  try {
    chrome.notifications.create(`${NOTIFY_PREFIX}-${id}-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 1,
    });
  } catch {
    // notifications permission missing or unavailable — no-op.
  }
}

async function maybeNotifyDeltas(
  previous: StoredLastCounts | null,
  current: DashboardCounts,
): Promise<void> {
  if (!previous) return;

  const newMentions = current.mentions - previous.mentions;
  if (newMentions > 0) {
    notify(
      'mentions',
      'New GitHub mentions',
      `You have ${newMentions} new mention${newMentions === 1 ? '' : 's'}.`,
    );
  }

  const newAssignments = current.assignedPrs - previous.assignedPrs;
  if (newAssignments > 0) {
    notify(
      'assigned',
      'New PR assignment',
      `${newAssignments} PR${newAssignments === 1 ? '' : 's'} assigned to you.`,
    );
  }

  const newReviews = current.reviewRequests - previous.reviewRequests;
  if (newReviews > 0) {
    notify(
      'reviews',
      'New review request',
      `${newReviews} review request${newReviews === 1 ? '' : 's'} pending.`,
    );
  }
}

export async function pollNow(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await updateBadge(null);
    return;
  }
  try {
    const counts = await fetchDashboardCounts(token, viewer.login);
    const previous = await getLastCounts();
    await maybeNotifyDeltas(previous, counts);
    await setLastCounts({
      assignedPrs: counts.assignedPrs,
      mentions: counts.mentions,
      reviewRequests: counts.reviewRequests,
      notifications: counts.notifications,
    });
    await updateBadge(counts);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
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
  void pollNow();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
  void pollNow();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void pollNow();
  }
});

// React to auth changes: clear/refresh the badge immediately rather than
// waiting for the next alarm tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  if ('gh_workflow_token_v1' in changes || 'gh_workflow_viewer_v1' in changes) {
    void pollNow();
  }
});

// Clicking a notification focuses/open the popup's GitHub page. We can't
// open the popup programmatically, so we open github.com/notifications.
chrome.notifications.onClicked.addListener((id) => {
  if (!id.startsWith(NOTIFY_PREFIX)) return;
  void chrome.tabs.create({ url: 'https://github.com/notifications' });
  chrome.notifications.clear(id);
});

export {};
