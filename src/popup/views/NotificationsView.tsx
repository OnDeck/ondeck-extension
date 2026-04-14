import { useMemo, useState } from 'react';
import {
  notificationHtmlUrl,
  type GitHubNotification,
  type NotificationReason,
  type NotificationSubjectType,
} from '../../lib/github-api';
import { formatRelativeTime } from '../../lib/relative-time';
import { ViewHeader } from '../components/ViewHeader';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  token: string | null;
}

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  mention: 'Mention',
  review_requested: 'Review',
  state_change: 'State',
  subscribed: 'Subscribed',
  team_mention: 'Team',
};

const REASON_FILTERS: Array<{ id: 'all' | NotificationReason; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'assign', label: 'Assigned' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review_requested', label: 'Reviews' },
  { id: 'comment', label: 'Comments' },
];

function typeIcon(type: NotificationSubjectType): string {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '⊙';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '⊕';
    case 'Commit':
      return '◆';
    default:
      return '•';
  }
}

function groupByRepo(items: GitHubNotification[]): Array<[string, GitHubNotification[]]> {
  const map = new Map<string, GitHubNotification[]>();
  for (const item of items) {
    const key = item.repository.full_name;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export function NotificationsView({ token }: Props) {
  const { status, items, error, refresh, markRead } = useNotifications(token);
  const [filter, setFilter] = useState<'all' | NotificationReason>('all');

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((n) => n.reason === filter)),
    [items, filter],
  );
  const grouped = useMemo(() => groupByRepo(visible), [visible]);

  return (
    <section className="flex h-full flex-col">
      <ViewHeader
        title="Notifications"
        count={status === 'ready' ? visible.length : undefined}
        busy={status === 'loading'}
        onRefresh={() => void refresh()}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-gh-border-muted px-3 py-2">
        {REASON_FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                'shrink-0 rounded-full border px-2 py-[2px] text-[10px] ' +
                (active
                  ? 'border-gh-accent-emphasis bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                  : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default')
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {status === 'error' && (
        <div className="mx-4 my-3 rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 p-2 text-[11px] text-gh-danger-emphasis">
          {error ?? 'Failed to load notifications.'}
        </div>
      )}

      {status === 'loading' && items.length === 0 && (
        <div className="flex-1 p-4 text-[11px] text-gh-fg-muted">Loading…</div>
      )}

      {status === 'ready' && visible.length === 0 && (
        <div className="flex-1 p-6 text-center text-[11px] text-gh-fg-muted">
          Inbox zero. Nice.
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {grouped.map(([repoName, entries]) => (
            <div key={repoName} className="border-b border-gh-border-muted">
              <div className="flex items-center gap-2 bg-gh-canvas-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
                <img
                  src={entries[0].repository.owner.avatar_url}
                  alt={entries[0].repository.owner.login}
                  className="h-3 w-3 rounded-full"
                />
                <span className="truncate">{repoName}</span>
              </div>
              <ul>
                {entries.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-2 border-t border-gh-border-muted px-3 py-2 hover:bg-gh-canvas-subtle"
                  >
                    <span
                      aria-hidden
                      className="mt-[2px] w-4 text-center text-[12px] text-gh-fg-muted"
                      title={n.subject.type}
                    >
                      {typeIcon(n.subject.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={notificationHtmlUrl(n)}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-[13px] text-gh-fg-default"
                      >
                        {n.subject.title}
                      </a>
                      <div className="flex items-center gap-2 text-[10px] text-gh-fg-muted">
                        <span>{REASON_LABELS[n.reason] ?? n.reason}</span>
                        <span aria-hidden>·</span>
                        <span>{formatRelativeTime(n.updated_at)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="rounded-md border border-gh-border-default px-2 py-[2px] text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
