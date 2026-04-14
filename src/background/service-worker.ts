// Background service worker: periodic fetch of actionable counts, badge
// updates, and desktop notifications for new mentions/assignments.

import { getStoredAuth } from '../lib/auth';
import {
  fetchAssignedPrCount,
  fetchMentionCount,
  fetchReviewRequestCount,
  fetchUnreadNotifications,
  type NotificationSubjectRef,
} from '../lib/github-api';

const POLL_ALARM = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const BADGE_COLOR_ACTIONABLE = '#1f6feb';
const BADGE_COLOR_URGENT = '#f85149';
const SEEN_STORAGE_KEY = 'gh_workflow_seen_notification_ids_v1';

interface Counts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  unread: number;
}

async function poll(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await setBadge(0, false);
    return;
  }
  try {
    const [assignedPrs, reviewRequests, mentions, notifications] = await Promise.all([
      fetchAssignedPrCount(viewer.login, token),
      fetchReviewRequestCount(viewer.login, token),
      fetchMentionCount(viewer.login, token),
      fetchUnreadNotifications(token),
    ]);

    const counts: Counts = {
      assignedPrs,
      reviewRequests,
      mentions,
      unread: notifications.length,
    };

    // Actionable = things the viewer actively owes or was pinged on.
    const actionable = counts.assignedPrs + counts.reviewRequests + counts.mentions;
    const urgent = counts.mentions > 0 || counts.reviewRequests > 0;
    await setBadge(actionable, urgent);

    await notifyNew(notifications);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

async function setBadge(count: number, urgent: boolean): Promise<void> {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  await chrome.action.setBadgeText({ text });
  if (count > 0) {
    await chrome.action.setBadgeBackgroundColor({
      color: urgent ? BADGE_COLOR_URGENT : BADGE_COLOR_ACTIONABLE,
    });
  }
}

async function notifyNew(items: NotificationSubjectRef[]): Promise<void> {
  const interesting = items.filter(
    (i) => i.reason === 'mention' || i.reason === 'assign' || i.reason === 'review_requested',
  );
  if (interesting.length === 0) return;

  const bag = await chrome.storage.local.get(SEEN_STORAGE_KEY);
  const seen = new Set<string>((bag[SEEN_STORAGE_KEY] as string[] | undefined) ?? []);
  const fresh = interesting.filter((i) => !seen.has(i.id));

  for (const item of fresh) {
    try {
      await chrome.notifications.create(`gh-workflow-${item.id}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: `${item.reason === 'mention' ? 'Mention' : item.reason === 'assign' ? 'Assigned' : 'Review requested'} in ${item.repo}`,
        message: item.title,
        priority: 1,
      });
    } catch (err) {
      console.warn('[gh-workflow] notification failed', err);
    }
  }

  // Persist the full current set, not just seen + fresh, so stale ids don't
  // accumulate indefinitely.
  const nextSeen = items.map((i) => i.id);
  await chrome.storage.local.set({ [SEEN_STORAGE_KEY]: nextSeen });
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[gh-workflow] extension installed');
  await chrome.alarms.create(POLL_ALARM, {
    delayInMinutes: 0.1,
    periodInMinutes: POLL_PERIOD_MINUTES,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(POLL_ALARM, {
    delayInMinutes: 0.1,
    periodInMinutes: POLL_PERIOD_MINUTES,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) void poll();
});

// React immediately when the user signs in or out.
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'sync' || area === 'local') {
    void poll();
  }
});

export {};
