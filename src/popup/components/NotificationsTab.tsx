import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  GitHubApiError,
  markNotificationRead,
  notificationHtmlUrl,
  type NotificationItem,
} from '../../lib/github-api';
import { openInNewTab, relativeTime } from '../lib/format';

type ReasonFilter = 'all' | 'mention' | 'review_requested' | 'assign' | 'author';

const FILTERS: Array<{ id: ReasonFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review_requested', label: 'Reviews' },
  { id: 'assign', label: 'Assigned' },
  { id: 'author', label: 'Author' },
];

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '!';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '↑';
    case 'Commit':
      return '◆';
    case 'CheckSuite':
      return '✓';
    default:
      return '•';
  }
}

export function NotificationsTab() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReasonFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new GitHubApiError('Not authenticated', 0, 'unauthorized');
      const data = await fetchNotifications(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === 'all') return items;
    return items.filter((i) => i.reason === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();
    for (const item of filtered) {
      const key = item.repository.full_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const handleMarkRead = useCallback(async (id: string) => {
    setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    try {
      const { token } = await getStoredAuth();
      if (!token) return;
      await markNotificationRead(id, token);
    } catch {
      // Best-effort; reload to recover canonical state.
      void load();
    }
  }, [load]);

  const handleOpen = useCallback(
    (item: NotificationItem) => {
      openInNewTab(notificationHtmlUrl(item));
      void handleMarkRead(item.id);
    },
    [handleMarkRead],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gh-fg-muted">Inbox</div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold ' +
                (active
                  ? 'border-gh-accent-emphasis text-gh-fg-default'
                  : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default')
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {!error && !loading && filtered.length === 0 && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          {items && items.length > 0 ? 'No notifications match this filter.' : 'Inbox zero.'}
        </div>
      )}

      {grouped.map(([repo, threads]) => (
        <div key={repo} className="flex flex-col gap-1">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
            {repo}
          </div>
          <ul className="flex flex-col gap-1">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className="flex items-center gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1.5"
              >
                <span className="w-4 text-center text-[11px] text-gh-fg-muted">
                  {typeIcon(thread.subject.type)}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpen(thread)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="line-clamp-1 text-xs font-medium text-gh-fg-default">
                    {thread.subject.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gh-fg-muted">
                    <span>{thread.reason}</span>
                    <span>{relativeTime(thread.updated_at)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkRead(thread.id)}
                  title="Mark as read"
                  className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {loading && !items && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          Loading…
        </div>
      )}
    </div>
  );
}
