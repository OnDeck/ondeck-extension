// Background service worker.
//
// Responsibilities:
//   - Periodically poll GitHub for actionable counts (assigned PRs, review
//     requests, mentions, unread notifications).
//   - Keep the toolbar badge in sync with the total actionable count.
//   - Fire a desktop notification when new mentions or new assignments
//     show up.
//   - Respect auth state (no polling when logged out).

import { getStoredAuth } from '../lib/auth';
import {
  fetchDashboardCounts,
  fetchMentions,
  fetchAssignedPrs,
  type DashboardCounts,
  type SearchIssueItem,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const LAST_SEEN_STORAGE_KEY = 'gh_workflow_last_seen_v1';
const LAST_COUNTS_STORAGE_KEY = 'gh_workflow_last_counts_v1';

interface LastSeen {
  mentionIds: number[];
  assignedIds: number[];
}

async function getLastSeen(): Promise<LastSeen> {
  const bag = await chrome.storage.local.get(LAST_SEEN_STORAGE_KEY);
  const stored = bag[LAST_SEEN_STORAGE_KEY] as LastSeen | undefined;
  return stored ?? { mentionIds: [], assignedIds: [] };
}

async function saveLastSeen(next: LastSeen): Promise<void> {
  await chrome.storage.local.set({ [LAST_SEEN_STORAGE_KEY]: next });
}

async function saveLastCounts(counts: DashboardCounts): Promise<void> {
  await chrome.storage.local.set({ [LAST_COUNTS_STORAGE_KEY]: counts });
}

function totalActionable(counts: DashboardCounts): number {
  return (
    counts.assignedPrs +
    counts.reviewRequests +
    counts.mentions +
    counts.unreadNotifications
  );
}

async function setBadge(counts: DashboardCounts): Promise<void> {
  const total = totalActionable(counts);
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: total === 0 ? '#30363d' : '#1f6feb',
  });
  // Newer Chromes support a badge text color; ignore failure on older.
  if (typeof chrome.action.setBadgeTextColor === 'function') {
    try {
      await chrome.action.setBadgeTextColor({ color: '#ffffff' });
    } catch {
      /* noop */
    }
  }
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

function fireNotification(id: string, title: string, message: string): void {
  try {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 1,
    });
  } catch {
    // chrome.notifications may not be available in some contexts (e.g. tests).
  }
}

function diffNewItems(items: SearchIssueItem[], seen: number[]): SearchIssueItem[] {
  const seenSet = new Set(seen);
  return items.filter((item) => !seenSet.has(item.id));
}

async function poll(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await clearBadge();
    return;
  }

  let counts: DashboardCounts;
  try {
    counts = await fetchDashboardCounts(viewer.login, token);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
    return;
  }

  await setBadge(counts);
  await saveLastCounts(counts);

  const lastSeen = await getLastSeen();

  // Fire notifications for NEW mentions and NEW assignments.
  // Fetch the lists in parallel — counts alone can't tell us which items
  // are new.
  try {
    const [mentions, assigned] = await Promise.all([
      fetchMentions(viewer.login, token),
      fetchAssignedPrs(viewer.login, token),
    ]);

    const isFirstRun = lastSeen.mentionIds.length === 0 && lastSeen.assignedIds.length === 0;

    if (!isFirstRun) {
      const newMentions = diffNewItems(mentions, lastSeen.mentionIds);
      const newAssigned = diffNewItems(assigned, lastSeen.assignedIds);

      if (newMentions.length > 0) {
        const first = newMentions[0];
        fireNotification(
          `mention-${first.id}`,
          newMentions.length === 1
            ? 'New mention on GitHub'
            : `${newMentions.length} new mentions on GitHub`,
          first.title,
        );
      }

      if (newAssigned.length > 0) {
        const first = newAssigned[0];
        fireNotification(
          `assigned-${first.id}`,
          newAssigned.length === 1
            ? 'New PR assigned to you'
            : `${newAssigned.length} new PRs assigned to you`,
          first.title,
        );
      }
    }

    await saveLastSeen({
      mentionIds: mentions.map((m) => m.id),
      assignedIds: assigned.map((a) => a.id),
    });
  } catch (err) {
    console.warn('[gh-workflow] detail fetch failed', err);
  }
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

// Re-poll when the popup signs in / out (token changes).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'gh_workflow_token_v1' in changes) {
    void poll();
  }
});

// Clicking a notification opens github.com.
chrome.notifications.onClicked.addListener((notificationId) => {
  void chrome.tabs.create({ url: 'https://github.com/notifications' });
  try {
    chrome.notifications.clear(notificationId);
  } catch {
    /* noop */
  }
});

export {};
