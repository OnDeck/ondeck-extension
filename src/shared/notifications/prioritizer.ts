import type { NotificationItem, NotificationReason } from '../../lib/github-api';

export type PriorityLevel = 'normal';

export interface NotificationPriorityResult {
  level: PriorityLevel;
  reason: string;
  score: number;
}

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

export function prioritizeNotification(item: NotificationItem): NotificationPriorityResult {
  const reason = REASON_LABELS[item.reason] ?? item.reason.replace(/_/g, ' ');
  return { level: 'normal', reason, score: 0 };
}

export type PrioritizedNotification = NotificationItem & { priority: NotificationPriorityResult };

export function prioritizeAll(items: NotificationItem[]): PrioritizedNotification[] {
  return items
    .map((item) => ({ ...item, priority: prioritizeNotification(item) }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
