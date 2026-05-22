import type { NotificationItem } from '../../lib/github-api';
import type { PriorityLevel, NotificationPriorityResult } from './prioritizer';

export type GroupBy = 'repository' | 'priority';

export type PrioritizedNotification = NotificationItem & {
  priority: NotificationPriorityResult;
};

export interface NotificationGroup {
  key: string;
  label: string;
  items: PrioritizedNotification[];
}

const PRIORITY_ORDER: PriorityLevel[] = ['normal'];

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  normal: 'Normal',
};

export function groupNotifications(
  items: PrioritizedNotification[],
  groupBy: GroupBy,
): NotificationGroup[] {
  return groupBy === 'priority'
    ? groupByPriority(items)
    : groupByRepository(items);
}

function groupByRepository(items: PrioritizedNotification[]): NotificationGroup[] {
  const map = new Map<string, PrioritizedNotification[]>();
  for (const item of items) {
    const key = item.repository.full_name;
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return Array.from(map.entries()).map(([key, groupItems]) => ({
    key,
    label: key,
    items: groupItems,
  }));
}

function groupByPriority(items: PrioritizedNotification[]): NotificationGroup[] {
  const map = new Map<PriorityLevel, PrioritizedNotification[]>(
    PRIORITY_ORDER.map((lvl) => [lvl, []]),
  );
  for (const item of items) {
    map.get(item.priority.level)?.push(item);
  }
  return PRIORITY_ORDER.filter((lvl) => (map.get(lvl)?.length ?? 0) > 0).map((lvl) => ({
    key: lvl,
    label: PRIORITY_LABELS[lvl],
    items: map.get(lvl) ?? [],
  }));
}
