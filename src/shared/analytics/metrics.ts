import type { PrioritizedNotification } from '../notifications/grouper';

export interface NotificationMetrics {
  total: number;
  unread: number;
  topRepositories: Array<{ repo: string; count: number }>;
}

export function computeMetrics(items: PrioritizedNotification[]): NotificationMetrics {
  const repoCounts = new Map<string, number>();

  for (const item of items) {
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
    topRepositories,
  };
}
