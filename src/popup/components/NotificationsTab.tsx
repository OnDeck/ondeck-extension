import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  markNotificationRead,
  notificationHtmlUrl,
  type GitHubNotification,
} from '../../lib/github-api';
import { openInNewTab, relativeTime } from '../../lib/format';

type Status = 'loading' | 'ready' | 'error';

type ReasonFilter = 'all' | 'mention' | 'review_requested' | 'assign' | 'author';

const REASON_LABELS: Record<ReasonFilter, string> = {
  all: 'All',
  mention: 'Mentions',
  review_requested: 'Reviews',
  assign: 'Assigned',
  author: 'Author',
};

const TYPE_GLYPHS: Record<string, string> = {
  PullRequest: '⇄',
  Issue: '◉',
  Discussion: '💬',
  Release: '🏷',
  Commit: '◆',
  CheckSuite: '✓',
};

function groupByRepo(notifs: GitHubNotification[]): Record<string, GitHubNotification[]> {
  const groups: Record<string, GitHubNotification[]> = {};
  for (const n of notifs) {
    const key = n.repository.full_name;
    (groups[key] ??= []).push(n);
  }
  return groups;
}

export function NotificationsTab() {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<GitHubNotification[]>([]);
  const [filter, setFilter] = useState<ReasonFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const result = await fetchNotifications(token);
      setItems(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((n) => n.reason === filter);
  }, [items, filter]);

  const grouped = useMemo(() => groupByRepo(visible), [visible]);

  const markRead = async (notif: GitHubNotification) => {
    const previous = items;
    setItems((prev) => prev.filter((n) => n.id !== notif.id));
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      await markNotificationRead(notif.id, token);
    } catch {
      // rollback on failure
      setItems(previous);
    }
  };

  const openAndMark = async (notif: GitHubNotification) => {
    openInNewTab(notificationHtmlUrl(notif));
    await markRead(notif);
  };

  if (status === 'loading' && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading inbox…
      </div>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <div className="space-y-2 text-xs">
        <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-gh-danger-emphasis">
          {error ?? 'Something went wrong'}
        </div>
        <button
          type="button"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis"
          onClick={() => void load()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(REASON_LABELS) as ReasonFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ' +
              (filter === key
                ? 'border-gh-accent-emphasis bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                : 'border-gh-border-default text-gh-fg-muted hover:border-gh-accent-emphasis')
            }
          >
            {REASON_LABELS[key]}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
          onClick={() => void load()}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '…' : 'Refresh'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-4 text-center text-gh-fg-muted">
          Inbox zero.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(grouped).map(([repo, threads]) => (
            <section key={repo}>
              <div className="mb-1 px-1 text-[11px] font-semibold text-gh-fg-muted">
                {repo}
              </div>
              <ul className="divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
                {threads.map((notif) => (
                  <li key={notif.id} className="flex items-start gap-2 px-3 py-2">
                    <span aria-hidden className="pt-0.5 text-gh-fg-muted">
                      {TYPE_GLYPHS[notif.subject.type] ?? '•'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void openAndMark(notif)}
                      className="flex min-w-0 flex-1 flex-col text-left hover:bg-black/20"
                    >
                      <span className="truncate text-gh-fg-default">
                        {notif.subject.title}
                      </span>
                      <span className="text-[11px] text-gh-fg-muted">
                        {notif.reason} · {relativeTime(notif.updated_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Mark as read"
                      title="Mark as read"
                      onClick={() => void markRead(notif)}
                      className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
                    >
                      ✓
                    </button>
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
