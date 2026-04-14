// Background service worker.
//
// Polls GitHub for unread/actionable counts on a fixed cadence via
// chrome.alarms, mirrors them onto the toolbar badge, and dispatches
// chrome.notifications when new mentions/assignments arrive. Polling
// is gated on auth state so we never hit the API while logged out.

import { getStoredAuth } from '../lib/auth';
import { fetchDashboardCounts, type DashboardCounts } from '../lib/github-counts';

const ALARM_NAME = 'gh-workflow-poll';
const ALARM_PERIOD_MINUTES = 5;
const SEEN_KEY = 'gh_workflow_last_counts_v1';
const BADGE_COLOR_DEFAULT = '#1f6feb';
const BADGE_COLOR_URGENT = '#f85149';

interface SeenSnapshot {
  assignedPRs: number;
  mentions: number;
}

async function setBadge(actionable: number): Promise<void> {
  const text = actionable > 0 ? (actionable > 99 ? '99+' : String(actionable)) : '';
  await chrome.action.setBadgeText({ text });
  if (actionable > 0) {
    await chrome.action.setBadgeBackgroundColor({
      color: actionable >= 10 ? BADGE_COLOR_URGENT : BADGE_COLOR_DEFAULT,
    });
  }
}

async function notifyNewItems(
  counts: DashboardCounts,
  previous: SeenSnapshot | null,
): Promise<void> {
  const newAssignments = counts.assignedPRs - (previous?.assignedPRs ?? counts.assignedPRs);
  const newMentions = counts.mentions - (previous?.mentions ?? counts.mentions);
  const messages: string[] = [];
  if (newAssignments > 0) messages.push(`${newAssignments} new assigned PR${newAssignments > 1 ? 's' : ''}`);
  if (newMentions > 0) messages.push(`${newMentions} new mention${newMentions > 1 ? 's' : ''}`);
  if (messages.length === 0) return;
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: 'GitHub Workflow',
    message: messages.join(' · '),
    priority: 1,
  });
}

async function poll(): Promise<void> {
  try {
    const { token, viewer } = await getStoredAuth();
    if (!token || !viewer) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }
    const counts = await fetchDashboardCounts(viewer.login, token);
    const actionable =
      counts.assignedPRs + counts.reviewRequests + counts.mentions + counts.notifications;
    await setBadge(actionable);

    const bag = await chrome.storage.local.get(SEEN_KEY);
    const previous = (bag[SEEN_KEY] as SeenSnapshot | undefined) ?? null;
    await notifyNewItems(counts, previous);
    await chrome.storage.local.set({
      [SEEN_KEY]: {
        assignedPRs: counts.assignedPRs,
        mentions: counts.mentions,
      } satisfies SeenSnapshot,
    });
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing) return;
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
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
  if (alarm.name === ALARM_NAME) void poll();
});

// React immediately to sign-in/sign-out events so the badge stays accurate
// without waiting for the next alarm tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  if (changes.gh_workflow_token_v1 || changes.gh_workflow_viewer_v1) {
    void poll();
  }
});

export {};
