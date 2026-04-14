// Background service worker.
//
// Keeps the extension badge in sync with the total count of actionable GitHub
// items (assigned PRs + review requests + mentions + unread notifications),
// and fires desktop notifications when new mentions or assignments appear.
//
// The worker only polls while the user is signed in — it inspects stored auth
// on every alarm and bails out early if we don't have a token.

import { getStoredAuth, VIEWER_STORAGE_KEY, TOKEN_STORAGE_KEY } from '../lib/auth';
import { fetchDashboardCounts, type DashboardCounts } from '../lib/github-api';

const POLL_ALARM = 'gh-workflow-poll';
const POLL_INTERVAL_MINUTES = 3;
const LAST_COUNTS_KEY = 'gh_workflow_last_counts_v1';

interface StoredCounts {
  counts: DashboardCounts;
  fetchedAt: number;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
  void ensureAlarm();
  void runPoll();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
  void runPoll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) {
    void runPoll();
  }
});

// Re-poll immediately when auth state changes so the badge reflects sign in /
// sign out without waiting for the next alarm tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[TOKEN_STORAGE_KEY]) {
    void runPoll();
  }
  if (area === 'local' && changes[VIEWER_STORAGE_KEY]) {
    void runPoll();
  }
});

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(POLL_ALARM);
  if (!existing) {
    await chrome.alarms.create(POLL_ALARM, {
      periodInMinutes: POLL_INTERVAL_MINUTES,
      delayInMinutes: 0.1,
    });
  }
}

async function runPoll(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await clearBadge();
    return;
  }
  try {
    const counts = await fetchDashboardCounts(token, viewer.login);
    await updateBadge(counts);
    await maybeNotify(counts);
    await persistCounts(counts);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

async function updateBadge(counts: DashboardCounts): Promise<void> {
  const total =
    counts.assignedPrs +
    counts.reviewRequests +
    counts.mentions +
    counts.notifications;
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  const color =
    counts.mentions > 0 || counts.reviewRequests > 0
      ? '#f85149' // danger red for blocking items
      : total > 0
        ? '#1f6feb' // accent blue for FYI items
        : '#30363d';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setTitle({
    title: total === 0 ? 'GitHub Workflow Assistant' : `${total} items need attention`,
  });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
  await chrome.action.setTitle({ title: 'GitHub Workflow Assistant (signed out)' });
}

async function loadStoredCounts(): Promise<StoredCounts | null> {
  const bag = await chrome.storage.local.get(LAST_COUNTS_KEY);
  return (bag[LAST_COUNTS_KEY] as StoredCounts | undefined) ?? null;
}

async function persistCounts(counts: DashboardCounts): Promise<void> {
  const payload: StoredCounts = { counts, fetchedAt: Date.now() };
  await chrome.storage.local.set({ [LAST_COUNTS_KEY]: payload });
}

async function maybeNotify(next: DashboardCounts): Promise<void> {
  const prev = await loadStoredCounts();
  if (!prev) return; // First poll — avoid a spam notification burst.
  const newMentions = Math.max(0, next.mentions - prev.counts.mentions);
  const newAssigned = Math.max(0, next.assignedPrs - prev.counts.assignedPrs);
  const newReviews = Math.max(0, next.reviewRequests - prev.counts.reviewRequests);

  if (newMentions > 0) {
    await notify('mention', `${newMentions} new mention${newMentions === 1 ? '' : 's'}`);
  }
  if (newAssigned > 0) {
    await notify('assigned', `${newAssigned} new PR${newAssigned === 1 ? '' : 's'} assigned to you`);
  }
  if (newReviews > 0) {
    await notify('reviews', `${newReviews} new review request${newReviews === 1 ? '' : 's'}`);
  }
}

async function notify(kind: string, message: string): Promise<void> {
  const id = `gh-workflow-${kind}-${Date.now()}`;
  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'GitHub Workflow Assistant',
      message,
      priority: 1,
    });
  } catch (err) {
    console.warn('[gh-workflow] notification failed', err);
  }
}

// Opening a notification should focus the popup — but popups can't be opened
// programmatically, so we just dismiss the toast.
chrome.notifications.onClicked.addListener((notificationId) => {
  void chrome.notifications.clear(notificationId);
});

export {};
