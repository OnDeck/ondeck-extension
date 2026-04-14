import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListShell } from '../components/ListShell';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  markNotificationRead,
  notificationHtmlUrl,
  GitHubApiError,
  type NotificationThread,
} from '../../lib/github-api';
import { openInNewTab, relativeTime } from '../../lib/format';

type Status = 'loading' | 'ready' | 'error' | 'empty';

type ReasonFilter = 'all' | 'mention' | 'review_requested' | 'assign' | 'author';

const REASON_FILTERS: Array<{ id: ReasonFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review_requested', label: 'Reviews' },
  { id: 'assign', label: 'Assigned' },
  { id: 'author', label: 'Author' },
];

function typeGlyph(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇣';
    case 'Issue':
      return '◉';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '⚑';
    case 'Commit':
      return '◆';
    case 'CheckSuite':
      return '✓';
    default:
      return '•';
  }
}

export function NotificationsTab() {
  const [status, setStatus] = useState<Status>('loading');
  const [threads, setThreads] = useState<NotificationThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReasonFilter>('all');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const { token } = await getStoredAuth();
    if (!token) {
      setStatus('error');
      setError('You are signed out.');
      return;
    }
    try {
      const data = await fetchNotifications(token);
      setThreads(data);
      setStatus(data.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load notifications',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return threads;
    return threads.filter((t) => t.reason === filter);
  }, [threads, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationThread[]>();
    for (const thread of filtered) {
      const key = thread.repository.full_name;
      const bucket = map.get(key) ?? [];
      bucket.push(thread);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const markRead = useCallback(async (thread: NotificationThread) => {
    const previous = threads;
    setThreads((list) => list.filter((t) => t.id !== thread.id));
    const { token } = await getStoredAuth();
    if (!token) {
      setThreads(previous);
      return;
    }
    try {
      await markNotificationRead(thread.id, token);
    } catch {
      // Roll back on failure
      setThreads(previous);
    }
  }, [threads]);

  const open = useCallback((thread: NotificationThread) => {
    openInNewTab(notificationHtmlUrl(thread));
    void markRead(thread);
  }, [markRead]);

  const listStatus: Status =
    status === 'ready' && grouped.length === 0 ? 'empty' : status;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-gh-border-default px-2 py-1.5">
        {REASON_FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ' +
                (active
                  ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                  : 'border-gh-border-muted text-gh-fg-muted hover:text-gh-fg-default')
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <ListShell
        title="Inbox"
        onRefresh={() => void load()}
        busy={status === 'loading'}
        status={listStatus}
        error={error}
        emptyMessage="No unread notifications in this filter."
      >
        {grouped.map(([repo, items]) => (
          <div key={repo} className="flex flex-col gap-1">
            <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
              {repo}
            </div>
            {items.map((thread) => (
              <div
                key={thread.id}
                className="flex items-start gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gh-border-muted text-[11px]"
                >
                  {typeGlyph(thread.subject.type)}
                </span>
                <button
                  type="button"
                  onClick={() => open(thread)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-xs font-semibold text-gh-fg-default">
                    {thread.subject.title}
                  </div>
                  <div className="text-[11px] text-gh-fg-muted">
                    {thread.reason} · {relativeTime(thread.updated_at)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void markRead(thread)}
                  aria-label="Mark as read"
                  className="shrink-0 rounded-md border border-gh-border-default px-2 text-[11px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
                >
                  ✓
                </button>
              </div>
            ))}
          </div>
        ))}
      </ListShell>
    </div>
  );
}
