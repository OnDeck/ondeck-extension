// Background service worker.
//
// Responsibilities (ticket #8):
//   1. Poll GitHub for the four dashboard counters on a schedule via
//      chrome.alarms so the user sees fresh numbers without opening the
//      popup.
//   2. Mirror the total actionable count onto the extension badge.
//   3. Fire a chrome.notifications toast when a brand-new mention or
//      assignment appears so the user can react immediately.
//   4. Respect the auth state: if the user is signed out, stop polling
//      and clear the badge.
import { getStoredAuth } from '../lib/auth';
import { fetchDashboardCounts, type DashboardCounts } from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-poll';
const POLL_MINUTES = 5;
const LAST_COUNTS_KEY = 'gh_workflow_last_counts_v1';

interface PersistedCounts extends DashboardCounts {
  fetchedAt: number;
}

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
  if (alarm.name === ALARM_NAME) void poll();
});

// React to sign-in / sign-out events so the badge updates immediately
// without waiting for the next alarm tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'gh_workflow_token_v1' in changes) {
    void poll();
  }
});

async function scheduleAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing) return;
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: POLL_MINUTES,
    delayInMinutes: 1,
  });
}

async function poll(): Promise<void> {
  try {
    const { token, viewer } = await getStoredAuth();
    if (!token || !viewer) {
      await clearBadge();
      return;
    }
    const counts = await fetchDashboardCounts(token, viewer.login);
    await applyBadge(counts);
    await notifyOnDelta(counts);
    await persistCounts(counts);
  } catch (err) {
    console.warn('[gh-workflow] poll failed', err);
  }
}

async function applyBadge(counts: DashboardCounts): Promise<void> {
  const total =
    counts.assigned + counts.reviews + counts.mentions + counts.notifications;
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  // Primer accent blue when there's normal work, attention amber when
  // a review request or mention is waiting on the user.
  const needsAttention = counts.reviews > 0 || counts.mentions > 0;
  const color = needsAttention ? '#9e6a03' : '#1f6feb';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

async function notifyOnDelta(next: DashboardCounts): Promise<void> {
  const prev = await readCounts();
  if (!prev) return; // First run — avoid a spam of notifications.
  const newMentions = Math.max(0, next.mentions - prev.mentions);
  const newAssigned = Math.max(0, next.assigned - prev.assigned);
  if (newMentions === 0 && newAssigned === 0) return;
  const parts: string[] = [];
  if (newMentions > 0) parts.push(`${newMentions} new mention${newMentions > 1 ? 's' : ''}`);
  if (newAssigned > 0)
    parts.push(`${newAssigned} new assigned PR${newAssigned > 1 ? 's' : ''}`);
  try {
    await chrome.notifications.create(`gh-workflow-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'GitHub Workflow',
      message: parts.join(' · '),
      priority: 1,
    });
  } catch (err) {
    console.warn('[gh-workflow] notification failed', err);
  }
}

async function persistCounts(counts: DashboardCounts): Promise<void> {
  const payload: PersistedCounts = { ...counts, fetchedAt: Date.now() };
  await chrome.storage.local.set({ [LAST_COUNTS_KEY]: payload });
}

async function readCounts(): Promise<PersistedCounts | null> {
  const bag = await chrome.storage.local.get(LAST_COUNTS_KEY);
  return (bag[LAST_COUNTS_KEY] as PersistedCounts | undefined) ?? null;
}

export {};
