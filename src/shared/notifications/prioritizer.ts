import type { NotificationItem, NotificationReason } from '../../lib/github-api';

export type PriorityLevel = 'critical' | 'important' | 'normal' | 'muted';

export interface NotificationPriorityResult {
  level: PriorityLevel;
  reason: string;
  score: number;
}

// Higher score = higher priority. Thresholds: ≥90 critical, ≥60 important, ≥20 normal, else muted.
const REASON_SCORES: Record<NotificationReason, number> = {
  review_requested: 100,
  security_alert: 95,
  assign: 80,
  mention: 70,
  team_mention: 65,
  ci_activity: 50,
  author: 40,
  comment: 30,
  state_change: 25,
  push: 15,
  invitation: 15,
  manual: 10,
  subscribed: 5,
};

const REASON_LABELS: Record<NotificationReason, string> = {
  review_requested: 'Review requested',
  security_alert: 'Security alert',
  assign: 'Assigned to you',
  mention: 'You were mentioned',
  team_mention: 'Team mention',
  ci_activity: 'CI activity',
  author: 'You are the author',
  comment: 'New comment',
  state_change: 'State changed',
  push: 'Push',
  invitation: 'Invitation',
  manual: 'Subscribed',
  subscribed: 'Subscribed',
};

function scoreToLevel(score: number): PriorityLevel {
  if (score >= 90) return 'critical';
  if (score >= 60) return 'important';
  if (score >= 20) return 'normal';
  return 'muted';
}

export function prioritizeNotification(item: NotificationItem): NotificationPriorityResult {
  const score = REASON_SCORES[item.reason] ?? 5;
  const level = scoreToLevel(score);
  const reason = REASON_LABELS[item.reason] ?? item.reason.replace(/_/g, ' ');
  return { level, reason, score };
}

export function prioritizeAll(
  items: NotificationItem[],
): Array<NotificationItem & { priority: NotificationPriorityResult }> {
  return items
    .map((item) => ({ ...item, priority: prioritizeNotification(item) }))
    .sort((a, b) => b.priority.score - a.priority.score);
}
