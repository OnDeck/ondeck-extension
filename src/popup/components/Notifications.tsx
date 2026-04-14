import { useMemo, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  notificationHtmlUrl,
  type NotificationItem,
  type NotificationReason,
} from '../../lib/github-api';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { relativeTime } from '../lib/relativeTime';
import { EmptyState, ErrorState, Spinner } from './States';

interface Props {
  token: string;
}

type ReasonFilter = 'all' | NotificationReason;

const REASON_FILTERS: Array<{ id: ReasonFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'assign', label: 'Assigned' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review_requested', label: 'Reviews' },
  { id: 'team_mention', label: 'Team' },
];

function SubjectIcon({ type }: { type: string }) {
  // Unicode glyphs keep this dependency-free. Colors come from Primer tokens.
  const map: Record<string, { icon: string; color: string }> = {
    PullRequest: { icon: '⬈', color: 'text-gh-success-emphasis' },
    Issue: { icon: '◎', color: 'text-gh-success-emphasis' },
    Discussion: { icon: '💬', color: 'text-gh-done-emphasis' },
    Release: { icon: '⏷', color: 'text-gh-accent-emphasis' },
    Commit: { icon: '◆', color: 'text-gh-fg-muted' },
    CheckSuite: { icon: '✓', color: 'text-gh-attention-emphasis' },
  };
  const entry = map[type] ?? { icon: '•', color: 'text-gh-fg-muted' };
  return (
    <span aria-hidden="true" className={`mt-0.5 shrink-0 text-sm ${entry.color}`}>
      {entry.icon}
    </span>
  );
}

export function Notifications({ token }: Props) {
  const query = useGitHubQuery(() => listNotifications(token, { all: false }), [token]);
  const [filter, setFilter] = useState<ReasonFilter>('all');
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    const visible = items.filter((n) => !locallyRead.has(n.id));
    if (filter === 'all') return visible;
    return visible.filter((n) => n.reason === filter);
  }, [query.data, filter, locallyRead]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const item of filtered) {
      const key = item.repository.full_name;
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleMarkRead = async (item: NotificationItem) => {
    setMarkingIds((prev) => new Set(prev).add(item.id));
    try {
      await markNotificationRead(token, item.id);
      setLocallyRead((prev) => new Set(prev).add(item.id));
    } catch {
      // Leave the row visible; the error state covers re-fetch via refetch.
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-gh-border-muted px-2 py-1.5">
        {REASON_FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ' +
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

      <div className="flex-1 overflow-y-auto">
        {query.status === 'loading' || query.status === 'idle' ? (
          <Spinner />
        ) : query.status === 'error' && query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : grouped.length === 0 ? (
          <EmptyState
            title="Inbox zero"
            hint="Unread notifications will appear here."
          />
        ) : (
          grouped.map(([repo, items]) => (
            <section key={repo} className="border-b border-gh-border-muted last:border-b-0">
              <header className="sticky top-0 bg-gh-canvas-subtle px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
                {repo}
              </header>
              {items.map((item) => {
                const marking = markingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 border-t border-gh-border-muted px-4 py-2 first:border-t-0 hover:bg-gh-canvas-subtle"
                  >
                    <SubjectIcon type={item.subject.type} />
                    <a
                      href={notificationHtmlUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-xs font-semibold text-gh-fg-default hover:text-gh-accent-emphasis">
                        {item.subject.title}
                      </div>
                      <div className="mt-0.5 text-[10px] text-gh-fg-muted">
                        {item.reason.replace(/_/g, ' ')} · {relativeTime(item.updated_at)}
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(item)}
                      disabled={marking}
                      title="Mark as read"
                      className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-50"
                    >
                      {marking ? '…' : '✓'}
                    </button>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
