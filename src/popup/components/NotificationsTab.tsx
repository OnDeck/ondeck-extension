import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  notificationHref,
  type NotificationItem,
  type NotificationReason,
} from '../../lib/github-api';
import { getStoredToken } from '../../lib/auth';

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Authored',
  comment: 'Comment',
  mention: 'Mentioned',
  review_requested: 'Review requested',
  subscribed: 'Subscribed',
  team_mention: 'Team mention',
  state_change: 'State change',
  security_alert: 'Security alert',
  ci_activity: 'CI activity',
};

const REASON_FILTERS: { value: NotificationReason | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mention', label: 'Mentioned' },
  { value: 'review_requested', label: 'Review' },
  { value: 'assign', label: 'Assigned' },
  { value: 'author', label: 'Authored' },
];

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '◎';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '⛳';
    case 'Commit':
      return '✓';
    case 'CheckSuite':
      return '⚙';
    default:
      return '•';
  }
}

export function NotificationsTab() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationReason | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getStoredToken();
      if (!token) throw new Error('Not signed in');
      setItems(await fetchNotifications(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onMarkRead = useCallback(async (id: string) => {
    try {
      const token = await getStoredToken();
      if (!token) return;
      await markNotificationRead(token, id);
      setItems((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === 'all') return items;
    return items.filter((n) => n.reason === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    if (!filtered) return null;
    const map = new Map<string, NotificationItem[]>();
    for (const n of filtered) {
      const key = n.repository.full_name;
      const list = map.get(key);
      if (list) list.push(n);
      else map.set(key, [n]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Notifications
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-2 flex gap-1 overflow-x-auto px-4">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
              filter === f.value
                ? 'border-gh-accent-emphasis bg-gh-canvas-subtle text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:border-gh-accent-emphasis'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {loading && !items && (
        <div className="mx-4 mt-3 text-xs text-gh-fg-muted">Loading…</div>
      )}

      {grouped && grouped.length === 0 && !loading && !error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          Inbox zero. Nothing unread.
        </div>
      )}

      {grouped && grouped.length > 0 && (
        <div className="mt-2 flex flex-col gap-3 px-2 pb-3">
          {grouped.map(([repo, notifs]) => (
            <section key={repo}>
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
                {repo}
              </div>
              <ul className="flex flex-col gap-1">
                {notifs.map((n) => (
                  <li key={n.id}>
                    <div className="group flex items-start gap-2 rounded-md border border-transparent px-3 py-2 hover:border-gh-border-default hover:bg-gh-canvas-subtle">
                      <span className="mt-0.5 w-4 shrink-0 text-center text-sm text-gh-fg-muted">
                        {typeIcon(n.subject.type)}
                      </span>
                      <a
                        href={notificationHref(n)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1"
                      >
                        <div className="truncate text-sm text-gh-fg-default">
                          {n.subject.title}
                        </div>
                        <div className="text-[11px] text-gh-fg-muted">
                          {REASON_LABELS[n.reason] ?? n.reason} · {timeAgo(n.updated_at)}
                        </div>
                      </a>
                      <button
                        type="button"
                        onClick={() => void onMarkRead(n.id)}
                        title="Mark as read"
                        className="shrink-0 self-center rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted opacity-0 transition group-hover:opacity-100 hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                      >
                        Read
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
