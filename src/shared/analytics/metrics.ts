import type { PriorityLevel } from '../notifications/prioritizer';
import type { PrioritizedNotification } from '../notifications/grouper';

export interface NotificationMetrics {
  total: number;
  unread: number;
  byPriority: Record<PriorityLevel, number>;
  topRepositories: Array<{ repo: string; count: number }>;
}

const ZERO_BY_PRIORITY: Record<PriorityLevel, number> = {
  critical: 0,
  important: 0,
  normal: 0,
  muted: 0,
};

export function computeMetrics(items: PrioritizedNotification[]): NotificationMetrics {
  const byPriority: Record<PriorityLevel, number> = { ...ZERO_BY_PRIORITY };
  const repoCounts = new Map<string, number>();

  for (const item of items) {
    byPriority[item.priority.level]++;
    repoCounts.set(
      item.repository.full_name,
      (repoCounts.get(item.repository.full_name) ?? 0) + 1,
    );
  }

  const topRepositories = Array.from(repoCounts.entries())
    .map(([repo, count]) => ({ repo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: items.length,
    unread: items.filter((i) => i.unread).length,
    byPriority,
    topRepositories,
  };
}
