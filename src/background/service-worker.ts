// Background service worker for the GitHub Workflow Assistant extension.
// Polls GitHub on a chrome.alarms schedule, mirrors actionable counts onto
// the toolbar badge, and surfaces chrome.notifications when fresh
// mentions or assignments arrive.

import { getStoredAuth } from '../lib/auth';
import { fetchBadgeCounts, type BadgeCounts } from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const LAST_COUNTS_KEY = 'gh_workflow_last_counts_v1';

interface StoredCounts extends BadgeCounts {
  fetched_at: number;
}

const BADGE_BG = '#1f6feb'; // gh-accent-emphasis
const BADGE_BG_ZERO = '#30363d';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
  void scheduleAlarm();
  void poll();
});

chrome.runtime.onStartup.addListener(() => {
  void scheduleAlarm();
  void poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void poll();
  }
});

// Re-poll whenever auth state changes so the badge clears on sign-out and
// updates immediately on sign-in.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes['gh_workflow_token_v1']) {
    void poll();
  }
});

chrome.notifications?.onClicked?.addListener((notificationId) => {
  // Open the extension popup target page when the user clicks a system
  // notification. Service workers can't open the popup directly, so we open
  // the notifications view on github.com instead.
  chrome.tabs.create({ url: 'https://github.com/notifications' });
  chrome.notifications.clear(notificationId);
});

async function scheduleAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: POLL_PERIOD_MINUTES,
      delayInMinutes: 1,
    });
  }
}

async function poll(): Promise<void> {
  try {
    const { token, viewer } = await getStoredAuth();
    if (!token || !viewer) {
      await clearBadge();
      return;
    }
    const counts = await fetchBadgeCounts(token, viewer.login);
    await applyBadge(counts);
    await maybeNotify(counts);
    await chrome.storage.local.set({
      [LAST_COUNTS_KEY]: { ...counts, fetched_at: Date.now() } satisfies StoredCounts,
    });
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

async function applyBadge(counts: BadgeCounts): Promise<void> {
  // Badge surfaces "things demanding attention" — review requests,
  // mentions, and notifications. Assigned PRs are informational only.
  const total = counts.reviewRequests + counts.mentions + counts.notifications;
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: total === 0 ? BADGE_BG_ZERO : BADGE_BG,
  });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

async function maybeNotify(next: BadgeCounts): Promise<void> {
  if (!chrome.notifications?.create) return;
  const previous = await loadLastCounts();
  if (!previous) return; // First poll: avoid spam.

  const newReviews = Math.max(0, next.reviewRequests - previous.reviewRequests);
  const newMentions = Math.max(0, next.mentions - previous.mentions);
  const newAssigned = Math.max(0, next.assignedPrs - previous.assignedPrs);

  if (newReviews + newMentions + newAssigned === 0) return;

  const lines: string[] = [];
  if (newReviews) lines.push(`${newReviews} new review request${newReviews === 1 ? '' : 's'}`);
  if (newMentions) lines.push(`${newMentions} new mention${newMentions === 1 ? '' : 's'}`);
  if (newAssigned) lines.push(`${newAssigned} new PR assignment${newAssigned === 1 ? '' : 's'}`);

  chrome.notifications.create(`gh-workflow-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'GitHub Workflow',
    message: lines.join(' · '),
    priority: 1,
  });
}

async function loadLastCounts(): Promise<StoredCounts | null> {
  const bag = await chrome.storage.local.get(LAST_COUNTS_KEY);
  return (bag[LAST_COUNTS_KEY] as StoredCounts | undefined) ?? null;
}

export {};
