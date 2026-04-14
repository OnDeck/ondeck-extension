// Background service worker entry point.
//
// Responsibilities:
//   - Register a chrome.alarms schedule to poll GitHub counts
//   - Keep chrome.action badge text / color in sync with the totals
//   - Fire chrome.notifications for newly assigned PRs or review requests
//   - Only poll when the user is signed in

import { TOKEN_STORAGE_KEY, getStoredAuth } from '../lib/auth';
import {
  GitHubApiError,
  fetchDashboardCounts,
  type DashboardCounts,
} from '../lib/github-api';

const POLL_ALARM = 'gh-workflow-poll';
const POLL_PERIOD_MINUTES = 5;
const SEEN_STORAGE_KEY = 'gh_workflow_seen_v1';

interface SeenState {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
}

const DEFAULT_SEEN: SeenState = {
  assignedPrs: 0,
  reviewRequests: 0,
  mentions: 0,
};

async function loadSeen(): Promise<SeenState> {
  const bag = await chrome.storage.local.get(SEEN_STORAGE_KEY);
  const stored = bag[SEEN_STORAGE_KEY] as Partial<SeenState> | undefined;
  return { ...DEFAULT_SEEN, ...(stored ?? {}) };
}

async function saveSeen(seen: SeenState): Promise<void> {
  await chrome.storage.local.set({ [SEEN_STORAGE_KEY]: seen });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

function formatBadge(total: number): string {
  if (total <= 0) return '';
  if (total > 99) return '99+';
  return String(total);
}

function pickBadgeColor(counts: DashboardCounts): string {
  if (counts.reviewRequests > 0) return '#f85149'; // danger — review blocks others
  if (counts.mentions > 0) return '#9e6a03'; // attention — mentioned
  if (counts.assignedPrs > 0) return '#1f6feb'; // accent — your work
  return '#30363d';
}

async function updateBadge(counts: DashboardCounts): Promise<void> {
  const total =
    counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.unreadNotifications;
  await chrome.action.setBadgeText({ text: formatBadge(total) });
  await chrome.action.setBadgeBackgroundColor({ color: pickBadgeColor(counts) });
}

async function notifyDelta(prev: SeenState, next: DashboardCounts): Promise<void> {
  if (!chrome.notifications?.create) return;
  const newAssigned = Math.max(0, next.assignedPrs - prev.assignedPrs);
  const newReviews = Math.max(0, next.reviewRequests - prev.reviewRequests);
  const newMentions = Math.max(0, next.mentions - prev.mentions);
  const parts: string[] = [];
  if (newAssigned > 0) parts.push(`${newAssigned} new assigned PR${newAssigned === 1 ? '' : 's'}`);
  if (newReviews > 0) parts.push(`${newReviews} new review request${newReviews === 1 ? '' : 's'}`);
  if (newMentions > 0) parts.push(`${newMentions} new mention${newMentions === 1 ? '' : 's'}`);
  if (parts.length === 0) return;
  chrome.notifications.create(`gh-workflow-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'GitHub Workflow Assistant',
    message: parts.join(' · '),
    priority: 1,
  });
}

async function pollOnce(): Promise<void> {
  const { token, viewer } = await getStoredAuth();
  if (!token || !viewer) {
    await clearBadge();
    return;
  }
  try {
    const counts = await fetchDashboardCounts(viewer.login, token);
    await updateBadge(counts);
    const prev = await loadSeen();
    await notifyDelta(prev, counts);
    await saveSeen({
      assignedPrs: counts.assignedPrs,
      reviewRequests: counts.reviewRequests,
      mentions: counts.mentions,
    });
  } catch (err) {
    if (err instanceof GitHubApiError && err.kind === 'unauthorized') {
      await clearBadge();
    }
    // Network / rate-limit errors are tolerated — retry on next alarm.
    console.warn('[gh-workflow] poll failed', err);
  }
}

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(POLL_ALARM);
  if (existing) return;
  chrome.alarms.create(POLL_ALARM, {
    periodInMinutes: POLL_PERIOD_MINUTES,
    delayInMinutes: 0.1,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureAlarm();
  void pollOnce();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAlarm();
  void pollOnce();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) void pollOnce();
});

// Re-poll immediately when the popup or options page signals a state change
// (e.g. sign-in / sign-out). Popups post a plain message {type:'refresh'}.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'gh-workflow:refresh') {
    void pollOnce().finally(() => sendResponse({ ok: true }));
    return true; // keep the channel open for async sendResponse
  }
  return false;
});

// Clear the badge immediately when the stored token is removed.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && TOKEN_STORAGE_KEY in changes) {
    const change = changes[TOKEN_STORAGE_KEY];
    if (change.newValue === undefined) {
      void clearBadge();
    } else {
      void pollOnce();
    }
  }
});

export {};
