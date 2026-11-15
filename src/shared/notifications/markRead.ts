import type { NotificationItem } from '../../lib/github-api';
import { latestUpdatedAt } from './merge';

export type MarkReadPlan =
  | { kind: 'none' }
  /** PUT /notifications — every thread updated up to `lastReadAt`. */
  | { kind: 'all'; lastReadAt: string; count: number }
  /** PUT /repos/{owner}/{repo}/notifications for each selected repo. */
  | { kind: 'repos'; repos: string[]; lastReadAt: string; count: number }
  /** PATCH each visible unread thread (a reason, search or date filter is active). */
  | { kind: 'threads'; ids: string[]; count: number };

interface PlanInput {
  /** Rows currently visible after every filter. */
  visible: NotificationItem[];
  /** True when the chip is Inbox/Unread and no search or date filter is applied. */
  unscoped: boolean;
  selectedRepos: string[];
}

/**
 * Pick the cheapest API call that marks exactly what the user is looking at.
 * The bulk endpoints can only scope by repo, so any other filter falls back to
 * per-thread requests. `lastReadAt` is the newest visible timestamp, not "now",
 * so a notification that arrives after the list loaded isn't marked unseen.
 */
export function planMarkRead({ visible, unscoped, selectedRepos }: PlanInput): MarkReadPlan {
  const unread = visible.filter((n) => n.unread);
  if (unread.length === 0) return { kind: 'none' };

  const newest = latestUpdatedAt(visible);
  if (unscoped && newest !== null) {
    const lastReadAt = new Date(newest).toISOString();
    return selectedRepos.length > 0
      ? { kind: 'repos', repos: selectedRepos, lastReadAt, count: unread.length }
      : { kind: 'all', lastReadAt, count: unread.length };
  }
  return { kind: 'threads', ids: unread.map((n) => n.id), count: unread.length };
}
