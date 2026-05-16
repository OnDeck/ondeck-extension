import type { PrioritizedNotification } from '../notifications/grouper';
import type { NotificationFilter } from './types';

export function applyFilter(
  items: PrioritizedNotification[],
  filter: NotificationFilter,
): PrioritizedNotification[] {
  return items.filter((item) => {
    if (
      filter.repositories?.length &&
      !filter.repositories.includes(item.repository.full_name)
    ) {
      return false;
    }
    if (filter.priorities?.length && !filter.priorities.includes(item.priority.level)) {
      return false;
    }
    if (filter.reasons?.length && !filter.reasons.includes(item.reason)) {
      return false;
    }
    if (filter.subjectTypes?.length && !filter.subjectTypes.includes(item.subject.type)) {
      return false;
    }
    if (filter.unreadOnly && !item.unread) {
      return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const titleMatch = item.subject.title.toLowerCase().includes(q);
      const repoMatch = item.repository.full_name.toLowerCase().includes(q);
      if (!titleMatch && !repoMatch) return false;
    }
    return true;
  });
}

export function extractRepositories(items: PrioritizedNotification[]): string[] {
  return [...new Set(items.map((i) => i.repository.full_name))].sort();
}
