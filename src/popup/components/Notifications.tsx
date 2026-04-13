import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  GitHubApiError,
  markNotificationAsRead,
  notificationHtmlUrl,
  type NotificationItem,
  type NotificationReason,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

const REASON_LABELS: Record<NotificationReason, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Commented',
  invitation: 'Invitation',
  manual: 'Manual',
  mention: 'Mentioned',
  review_requested: 'Review requested',
  security_alert: 'Security',
  state_change: 'State change',
  subscribed: 'Subscribed',
  team_mention: 'Team mention',
};

const REASON_FILTERS: { value: 'all' | NotificationReason; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'assign', label: 'Assigned' },
  { value: 'mention', label: 'Mentioned' },
  { value: 'review_requested', label: 'Review' },
];

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇆';
    case 'Issue':
      return '◉';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '🏷';
    case 'Commit':
      return '◆';
    case 'CheckSuite':
      return '✓';
    default:
      return '•';
  }
}

interface Group {
  repo: string;
  items: NotificationItem[];
}

export function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | NotificationReason>('all');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new GitHubApiError('Not signed in', 0, 'unauthorized');
      }
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

  const groups = useMemo<Group[]>(() => {
    if (!items) return [];
    const visible = filter === 'all' ? items : items.filter((i) => i.reason === filter);
    const map = new Map<string, NotificationItem[]>();
    for (const item of visible) {
      const repo = item.repository.full_name;
      const list = map.get(repo) ?? [];
      list.push(item);
      map.set(repo, list);
    }
    return Array.from(map.entries()).map(([repo, items]) => ({ repo, items }));
  }, [items, filter]);

  const handleMarkRead = useCallback(async (id: string) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const { token } = await getStoredAuth();
      if (!token) return;
      await markNotificationAsRead(token, id);
      setItems((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between border-b border-gh-border-default px-4 py-2">
        <h2 className="text-xs font-semibold">Notifications</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-1 border-b border-gh-border-default px-4 py-2">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md border px-2 py-0.5 text-[11px] ${
              filter === f.value
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && !items && (
        <p className="px-4 py-3 text-xs text-gh-fg-muted">Loading…</p>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {items && groups.length === 0 && !loading && (
        <p className="px-4 py-3 text-xs text-gh-fg-muted">
          You have no unread notifications.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.repo} className="border-b border-gh-border-muted">
          <div className="flex items-center gap-2 bg-gh-canvas-subtle px-4 py-1 text-[11px] font-semibold text-gh-fg-muted">
            <img
              src={group.items[0].repository.owner.avatar_url}
              alt={group.repo}
              className="h-4 w-4 rounded-sm border border-gh-border-default"
            />
            <span className="truncate">{group.repo}</span>
          </div>
          <ul>
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 px-4 py-2 hover:bg-gh-canvas-subtle"
              >
                <span
                  aria-hidden
                  className="mt-0.5 w-4 shrink-0 text-center text-[12px] text-gh-fg-muted"
                >
                  {typeIcon(item.subject.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={notificationHtmlUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-gh-fg-default hover:text-gh-accent-emphasis"
                  >
                    {item.subject.title}
                  </a>
                  <div className="text-[11px] text-gh-fg-muted">
                    {REASON_LABELS[item.reason] ?? item.reason}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleMarkRead(item.id)}
                  disabled={busyIds.has(item.id)}
                  className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
                  title="Mark as read"
                >
                  {busyIds.has(item.id) ? '…' : '✓'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
