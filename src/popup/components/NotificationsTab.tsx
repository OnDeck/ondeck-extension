import { useMemo, useState } from 'react';
import {
  notificationHtmlUrl,
  type GitHubNotification,
  type NotificationReason,
} from '../../lib/github-api';
import { useNotifications } from '../hooks/useNotifications';
import { relativeAge } from './IssueRowMeta';
import { TabHeader, TabStates } from './TabChrome';

interface Props {
  token: string;
}

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  invitation: 'Invitation',
  manual: 'Subscribed',
  mention: 'Mention',
  review_requested: 'Review requested',
  security_alert: 'Security',
  state_change: 'State change',
  subscribed: 'Subscribed',
  team_mention: 'Team mention',
};

const REASON_OPTIONS: { value: NotificationReason | 'all'; label: string }[] = [
  { value: 'all', label: 'All reasons' },
  { value: 'mention', label: 'Mention' },
  { value: 'review_requested', label: 'Review requested' },
  { value: 'assign', label: 'Assigned' },
  { value: 'author', label: 'Author' },
  { value: 'comment', label: 'Comment' },
  { value: 'team_mention', label: 'Team mention' },
];

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '◉';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '🏷';
    case 'Commit':
      return '●';
    default:
      return '•';
  }
}

function groupByRepo(
  items: GitHubNotification[],
): { repo: string; html_url: string; items: GitHubNotification[] }[] {
  const map = new Map<string, { repo: string; html_url: string; items: GitHubNotification[] }>();
  for (const n of items) {
    const key = n.repository.full_name;
    const bucket = map.get(key);
    if (bucket) {
      bucket.items.push(n);
    } else {
      map.set(key, {
        repo: key,
        html_url: n.repository.html_url,
        items: [n],
      });
    }
  }
  return Array.from(map.values());
}

export function NotificationsTab({ token }: Props) {
  const list = useNotifications(token);
  const [reason, setReason] = useState<NotificationReason | 'all'>('all');

  const filtered = useMemo(
    () => (reason === 'all' ? list.items : list.items.filter((n) => n.reason === reason)),
    [list.items, reason],
  );
  const grouped = useMemo(() => groupByRepo(filtered), [filtered]);

  return (
    <section>
      <TabHeader
        title="Notifications"
        subtitle="Unread GitHub inbox"
        status={list.status}
        onRefresh={() => void list.refresh()}
      />

      <div className="mb-2">
        <label className="sr-only" htmlFor="reason-filter">
          Filter by reason
        </label>
        <select
          id="reason-filter"
          value={reason}
          onChange={(e) => setReason(e.target.value as NotificationReason | 'all')}
          className="w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-xs text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <TabStates
        status={list.status}
        error={list.error}
        isEmpty={filtered.length === 0}
        emptyMessage={
          reason === 'all'
            ? 'Inbox zero. Nice work.'
            : 'No notifications match this filter.'
        }
      >
        <div className="flex flex-col gap-3">
          {grouped.map((group) => (
            <div key={group.repo}>
              <a
                href={group.html_url}
                target="_blank"
                rel="noreferrer"
                className="mb-1 block truncate text-[11px] font-semibold uppercase tracking-wider text-gh-fg-muted hover:text-gh-accent-emphasis"
              >
                {group.repo}
              </a>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2"
                  >
                    <span
                      className="mt-0.5 inline-block w-4 shrink-0 text-center text-xs text-gh-fg-muted"
                      aria-hidden
                    >
                      {typeIcon(n.subject.type)}
                    </span>
                    <a
                      href={notificationHtmlUrl(n)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 hover:text-gh-accent-emphasis"
                    >
                      <div className="truncate text-sm font-semibold text-gh-fg-default">
                        {n.subject.title}
                      </div>
                      <div className="truncate text-[11px] text-gh-fg-muted">
                        {REASON_LABELS[n.reason] ?? n.reason} ·{' '}
                        {relativeAge(n.updated_at)}
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => void list.markRead(n.id)}
                      title="Mark as read"
                      className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
                    >
                      ✓
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </TabStates>
    </section>
  );
}
