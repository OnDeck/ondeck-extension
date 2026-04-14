import { useMemo, useState } from 'react';
import {
  htmlUrlForNotificationSubject,
  type GitHubNotification,
  type NotificationReason,
} from '../../lib/github-api';
import { relativeAge } from '../../lib/time';
import { useNotifications } from '../hooks/useNotifications';

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  mention: 'Mentioned',
  review_requested: 'Review',
  security_alert: 'Security',
  state_change: 'State',
  subscribed: 'Subscribed',
  team_mention: 'Team',
  manual: 'Manual',
  invitation: 'Invitation',
};

const REASON_FILTERS: { id: 'all' | NotificationReason; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review_requested', label: 'Reviews' },
  { id: 'assign', label: 'Assigned' },
  { id: 'ci_activity', label: 'CI' },
];

const SUBJECT_ICONS: Record<string, string> = {
  PullRequest: '⇅',
  Issue: '●',
  Discussion: '💬',
  Release: '⭐',
  Commit: '◆',
  CheckSuite: '✓',
};

/**
 * Notifications tab. Renders the unread notifications inbox grouped by
 * repository, with per-row "mark as read" actions and a filter bar for
 * the most common `reason` values.
 */
export function NotificationsTab() {
  const { status, items, error, refresh, markRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | NotificationReason>('all');
  const loading = status === 'loading' || status === 'idle';

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((n) => n.reason === filter);
  }, [items, filter]);

  const grouped = useMemo(() => groupByRepo(visible), [visible]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Notifications
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 pb-2">
        {REASON_FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] transition ${
                active
                  ? 'border-gh-accent-emphasis bg-gh-accent-emphasis text-white'
                  : 'border-gh-border-default bg-gh-canvas-subtle text-gh-fg-muted hover:text-gh-fg-default'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {loading && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            Loading notifications…
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-danger-emphasis">
            {error ?? 'Failed to load notifications.'}
          </div>
        )}

        {status === 'ready' && visible.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
            {filter === 'all' ? 'Inbox zero — no unread notifications.' : 'Nothing matches this filter.'}
          </div>
        )}

        {grouped.map(([repoFullName, notifications]) => (
          <section key={repoFullName} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gh-fg-muted">
              <img
                src={notifications[0].ownerAvatar}
                alt=""
                className="h-4 w-4 rounded-full border border-gh-border-muted"
              />
              <span>{repoFullName}</span>
            </div>
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: GitHubNotification;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const icon = SUBJECT_ICONS[notification.subjectType] ?? '•';
  const reasonLabel = REASON_LABELS[notification.reason] ?? notification.reason;
  const href = htmlUrlForNotificationSubject(notification.subjectUrl, notification.repoHtmlUrl);

  const open = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      void chrome.tabs.create({ url: href });
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex items-start gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 transition hover:border-gh-accent-emphasis">
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-gh-border-muted text-[10px] text-gh-fg-muted"
        aria-hidden="true"
      >
        {icon}
      </span>
      <button
        type="button"
        onClick={open}
        className="flex flex-1 flex-col gap-0.5 text-left"
      >
        <span className="truncate text-xs font-medium text-gh-fg-default">
          {notification.title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
          <span>{reasonLabel}</span>
          <span>·</span>
          <span>{relativeAge(notification.updatedAt)}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => void onMarkRead(notification.id)}
        title="Mark as read"
        className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
      >
        ✓
      </button>
    </div>
  );
}

function groupByRepo(items: GitHubNotification[]): [string, GitHubNotification[]][] {
  const map = new Map<string, GitHubNotification[]>();
  for (const item of items) {
    const bucket = map.get(item.repoFullName);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(item.repoFullName, [item]);
    }
  }
  return Array.from(map.entries());
}
