import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  GitHubApiError,
  markNotificationRead,
  relativeTime,
  type NotificationThread,
} from '../../lib/github-api';

interface Props {
  token: string;
  onBack: () => void;
}

const REASONS = [
  'all',
  'mention',
  'review_requested',
  'assign',
  'team_mention',
  'author',
  'comment',
  'subscribed',
  'ci_activity',
] as const;
type Reason = (typeof REASONS)[number];

const REASON_LABEL: Record<string, string> = {
  mention: 'Mention',
  review_requested: 'Review',
  assign: 'Assigned',
  team_mention: 'Team',
  author: 'Author',
  comment: 'Comment',
  subscribed: 'Subscribed',
  ci_activity: 'CI',
  state_change: 'State',
  manual: 'Manual',
};

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '◎';
    case 'Discussion':
      return '✦';
    case 'Release':
      return '⌚';
    case 'Commit':
      return '✓';
    default:
      return '•';
  }
}

function webUrlFromApi(apiUrl: string | null, repoFullName: string): string {
  if (!apiUrl) return `https://github.com/${repoFullName}`;
  // /repos/{owner}/{repo}/pulls/123  →  /{owner}/{repo}/pull/123
  return apiUrl
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/');
}

export function NotificationsView({ token, onBack }: Props) {
  const [items, setItems] = useState<NotificationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNotifications(token, { all: false, perPage: 50 });
      setItems(next);
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load notifications',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (reason === 'all' ? items : items.filter((n) => n.reason === reason)),
    [items, reason],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationThread[]>();
    for (const thread of filtered) {
      const key = thread.repository.full_name;
      const list = map.get(key) ?? [];
      list.push(thread);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleMarkRead = async (thread: NotificationThread) => {
    const previous = items;
    setItems((prev) => prev.filter((t) => t.id !== thread.id));
    try {
      await markNotificationRead(token, thread.id);
    } catch {
      setItems(previous);
    }
  };

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
          >
            Back
          </button>
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 pt-2">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
              reason === r
                ? 'border-gh-accent-emphasis bg-gh-accent-emphasis/15 text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {r === 'all' ? 'All' : REASON_LABEL[r] ?? r.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && items.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-xs text-gh-fg-muted">
            Loading…
          </div>
        )}
        {error && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle p-3 text-xs text-gh-danger-emphasis">
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-center text-xs text-gh-fg-muted">
            No unread notifications.
          </div>
        )}
        <div className="space-y-3">
          {grouped.map(([repo, threads]) => (
            <div
              key={repo}
              className="overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle"
            >
              <div className="border-b border-gh-border-muted bg-gh-canvas-default px-3 py-1.5 text-[11px] font-semibold text-gh-fg-muted">
                {repo}
              </div>
              <ul className="divide-y divide-gh-border-muted">
                {threads.map((thread) => (
                  <li key={thread.id} className="flex items-start gap-2 px-3 py-2">
                    <span
                      className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gh-canvas-default text-[12px] text-gh-fg-muted"
                      aria-hidden
                    >
                      {typeIcon(thread.subject.type)}
                    </span>
                    <a
                      href={webUrlFromApi(thread.subject.url, thread.repository.full_name)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-xs text-gh-fg-default">
                        {thread.subject.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gh-fg-muted">
                        <span>{REASON_LABEL[thread.reason] ?? thread.reason}</span>
                        <span aria-hidden>·</span>
                        <span>{relativeTime(thread.updated_at)}</span>
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(thread)}
                      title="Mark as read"
                      className="flex-none rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                    >
                      ✓
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
