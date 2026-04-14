import { useMemo, useState } from 'react';
import {
  apiUrlToHtmlUrl,
  type GithubNotification,
  type NotificationReason,
} from '../../lib/github-api';
import { useNotifications } from '../hooks/useNotifications';
import { formatRelativeTime, openInNewTab } from '../lib/format';

interface Props {
  onBack: () => void;
}

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  invitation: 'Invitation',
  manual: 'Subscribed',
  mention: 'Mentioned',
  review_requested: 'Review requested',
  security_alert: 'Security',
  state_change: 'State change',
  subscribed: 'Subscribed',
  team_mention: 'Team mention',
};

const REASON_OPTIONS: { value: 'all' | NotificationReason; label: string }[] = [
  { value: 'all', label: 'All reasons' },
  { value: 'mention', label: 'Mentioned' },
  { value: 'assign', label: 'Assigned' },
  { value: 'review_requested', label: 'Review requested' },
  { value: 'comment', label: 'Comments' },
  { value: 'author', label: 'Author' },
  { value: 'ci_activity', label: 'CI' },
];

const TYPE_GLYPH: Record<string, string> = {
  PullRequest: '⇆',
  Issue: '●',
  Discussion: '✦',
  Release: '◎',
  Commit: '▣',
};

function typeGlyph(type: string): string {
  return TYPE_GLYPH[type] ?? '•';
}

function groupByRepo(
  items: GithubNotification[],
): { repo: string; items: GithubNotification[] }[] {
  const groups = new Map<string, GithubNotification[]>();
  for (const item of items) {
    const key = item.repository.full_name;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.entries()).map(([repo, groupItems]) => ({
    repo,
    items: groupItems,
  }));
}

export function Notifications({ onBack }: Props) {
  const { status, items, error, refresh, markRead } = useNotifications();
  const [reasonFilter, setReasonFilter] = useState<'all' | NotificationReason>('all');

  const filtered = useMemo(
    () => (reasonFilter === 'all' ? items : items.filter((n) => n.reason === reasonFilter)),
    [items, reasonFilter],
  );
  const groups = useMemo(() => groupByRepo(filtered), [filtered]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gh-border-default px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
          >
            ← Home
          </button>
          <div className="text-sm font-semibold">Notifications</div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-gh-border-muted px-4 py-2">
        <label className="text-[11px] uppercase tracking-wide text-gh-fg-muted">
          Filter
        </label>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as 'all' | NotificationReason)}
          className="flex-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-xs text-gh-fg-default"
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {status === 'error' ? (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis/40 bg-gh-danger-emphasis/10 p-3 text-xs text-gh-danger-emphasis">
          {error ?? 'Failed to load notifications.'}
        </div>
      ) : null}

      {status === 'loading' && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-gh-fg-muted">
          Loading…
        </div>
      ) : null}

      {status === 'ready' && filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
          {items.length === 0
            ? 'Inbox zero — no unread notifications.'
            : 'No notifications match this filter.'}
        </div>
      ) : null}

      {groups.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <section key={group.repo}>
              <div className="sticky top-0 z-10 border-b border-gh-border-muted bg-gh-canvas-default/95 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
                {group.repo}
              </div>
              <ul className="divide-y divide-gh-border-muted">
                {group.items.map((notification) => {
                  const htmlUrl =
                    apiUrlToHtmlUrl(notification.subject.url) ??
                    notification.repository.html_url;
                  const reasonLabel =
                    REASON_LABELS[notification.reason] ?? notification.reason;
                  return (
                    <li key={notification.id} className="flex items-start gap-2 px-4 py-3">
                      <span className="mt-1 text-xs text-gh-fg-muted">
                        {typeGlyph(notification.subject.type)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openInNewTab(htmlUrl)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-sm text-gh-fg-default">
                          {notification.subject.title}
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-gh-fg-muted">
                          <span className="truncate">{reasonLabel}</span>
                          <span className="shrink-0">
                            {formatRelativeTime(notification.updated_at)}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void markRead(notification.id)}
                        title="Mark as read"
                        className="shrink-0 rounded-md border border-gh-border-default px-2 py-1 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
                      >
                        ✓
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
