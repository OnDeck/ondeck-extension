// Background service worker.
//
// Keeps the action badge in sync with the user's actionable GitHub workload
// and fires desktop notifications when new mentions or assignments arrive.
//
// Data flow:
//   chrome.alarms (`gh-workflow-refresh`) --> fetchAggregatedCounts + new-item
//   detection --> chrome.action.setBadgeText + chrome.notifications.create
//
// Respect for auth state:
//   - No polling runs while the user is signed out. We listen on
//     chrome.storage.onChanged to restart the alarm when a token arrives and
//     to clear state when it disappears.

import { getStoredAuth, TOKEN_STORAGE_KEY } from '../lib/auth';
import {
  fetchAggregatedCounts,
  fetchNotifications,
  searchIssues,
  type AggregatedCounts,
} from '../lib/github-api';

const ALARM_NAME = 'gh-workflow-refresh';
const REFRESH_PERIOD_MINUTES = 2;
const SNAPSHOT_KEY = 'gh_workflow_badge_snapshot_v1';

const BADGE_COLOR_ACTIVE = '#1f6feb';
const BADGE_COLOR_ZERO = '#30363d';

interface Snapshot {
  counts: AggregatedCounts;
  assignedIds: number[];
  mentionNotificationIds: string[];
}

async function getSnapshot(): Promise<Snapshot | null> {
  const bag = await chrome.storage.local.get(SNAPSHOT_KEY);
  return (bag[SNAPSHOT_KEY] as Snapshot | undefined) ?? null;
}

async function setSnapshot(snapshot: Snapshot): Promise<void> {
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshot });
}

async function clearSnapshot(): Promise<void> {
  await chrome.storage.local.remove(SNAPSHOT_KEY);
}

function totalActionable(counts: AggregatedCounts): number {
  return (
    counts.assignedPrs +
    counts.reviewRequests +
    counts.mentions +
    counts.unreadNotifications
  );
}

async function setBadge(counts: AggregatedCounts): Promise<void> {
  const total = totalActionable(counts);
  const text = total === 0 ? '' : total > 99 ? '99+' : String(total);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: total === 0 ? BADGE_COLOR_ZERO : BADGE_COLOR_ACTIVE,
  });
}

async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}

function createNotification(id: string, title: string, message: string): void {
  if (!chrome.notifications) return;
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 1,
  });
}

async function detectNewAssignments(
  token: string,
  previousIds: number[],
): Promise<{ ids: number[]; fresh: Array<{ title: string; repo: string }> }> {
  const result = await searchIssues(
    token,
    'is:pr is:open assignee:@me archived:false',
    { perPage: 30 },
  );
  const ids = result.items.map((item) => item.id);
  const prev = new Set(previousIds);
  const fresh = result.items
    .filter((item) => !prev.has(item.id))
    .map((item) => ({
      title: item.title,
      repo: item.repository_url.replace(/.*\/repos\//, ''),
    }));
  return { ids, fresh };
}

async function detectNewMentionNotifications(
  token: string,
  previousIds: string[],
): Promise<{ ids: string[]; fresh: Array<{ title: string; repo: string }> }> {
  const notifications = await fetchNotifications(token, { unreadOnly: true });
  const mentions = notifications.filter(
    (n) => n.reason === 'mention' || n.reason === 'team_mention',
  );
  const ids = mentions.map((n) => n.id);
  const prev = new Set(previousIds);
  const fresh = mentions
    .filter((n) => !prev.has(n.id))
    .map((n) => ({ title: n.subject.title, repo: n.repository.full_name }));
  return { ids, fresh };
}

async function runRefresh(): Promise<void> {
  const { token } = await getStoredAuth();
  if (!token) {
    await clearBadge();
    await clearSnapshot();
    return;
  }
  try {
    const counts = await fetchAggregatedCounts(token);
    await setBadge(counts);

    const previous = await getSnapshot();
    const [{ ids: assignedIds, fresh: freshAssignments }, { ids: mentionIds, fresh: freshMentions }] =
      await Promise.all([
        detectNewAssignments(token, previous?.assignedIds ?? []),
        detectNewMentionNotifications(token, previous?.mentionNotificationIds ?? []),
      ]);

    // Only fire notifications after the first successful refresh, to avoid
    // spamming the user with their entire backlog on fresh install.
    if (previous) {
      for (const item of freshAssignments) {
        createNotification(
          `assigned-${item.repo}-${Date.now()}-${Math.random()}`,
          `New PR assigned in ${item.repo}`,
          item.title,
        );
      }
      for (const item of freshMentions) {
        createNotification(
          `mention-${item.repo}-${Date.now()}-${Math.random()}`,
          `You were mentioned in ${item.repo}`,
          item.title,
        );
      }
    }

    await setSnapshot({
      counts,
      assignedIds,
      mentionNotificationIds: mentionIds,
    });
  } catch (err) {
    console.warn('[gh-workflow] refresh failed', err);
  }
}

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (existing) return;
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: REFRESH_PERIOD_MINUTES,
    delayInMinutes: 0,
  });
}

async function tearDownAlarm(): Promise<void> {
  await chrome.alarms.clear(ALARM_NAME);
  await clearBadge();
  await clearSnapshot();
}

async function bootstrap(): Promise<void> {
  const { token } = await getStoredAuth();
  if (token) {
    await ensureAlarm();
    await runRefresh();
  } else {
    await tearDownAlarm();
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap();
});

chrome.runtime.onStartup.addListener(() => {
  void bootstrap();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void runRefresh();
  }
});

// React to sign-in / sign-out without waiting for the next alarm tick.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!(TOKEN_STORAGE_KEY in changes)) return;
  const newValue = changes[TOKEN_STORAGE_KEY].newValue;
  if (newValue) {
    void (async () => {
      await ensureAlarm();
      await runRefresh();
    })();
  } else {
    void tearDownAlarm();
  }
});

// Kick off on worker wake.
void bootstrap();

export {};
