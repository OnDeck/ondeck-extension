import { useMemo, useState } from 'react';
import {
  subjectUrlToHtmlUrl,
  type NotificationReason,
  type NotificationSubjectType,
  type NotificationThread,
} from '../../lib/github-api';
import { useNotifications } from '../hooks/useNotifications';
import { openInNewTab, relativeTime } from '../lib/format';
import { FeedHeader } from './FeedHeader';
import { FeedState } from './FeedState';

type ReasonFilter = 'all' | NotificationReason;

const REASON_FILTERS: { id: ReasonFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'assign', label: 'Assigned' },
  { id: 'mention', label: 'Mentioned' },
  { id: 'review_requested', label: 'Review' },
  { id: 'author', label: 'Author' },
  { id: 'ci_activity', label: 'CI' },
];

const SUBJECT_ICONS: Record<string, string> = {
  PullRequest: '⇄',
  Issue: '●',
  Discussion: '💬',
  Release: '⚑',
  Commit: '❖',
  CheckSuite: '✓',
};

function subjectIcon(type: NotificationSubjectType): string {
  return SUBJECT_ICONS[type] ?? '•';
}

function reasonLabel(reason: NotificationReason): string {
  const map: Record<string, string> = {
    assign: 'Assigned',
    author: 'Author',
    comment: 'Comment',
    ci_activity: 'CI',
    mention: 'Mentioned',
    review_requested: 'Review requested',
    state_change: 'State change',
    subscribed: 'Subscribed',
    team_mention: 'Team mention',
    security_alert: 'Security',
  };
  return map[reason] ?? reason;
}

export function NotificationsTab() {
  const { status, threads, error, refresh, markRead } = useNotifications();
  const [filter, setFilter] = useState<ReasonFilter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? threads : threads.filter((t) => t.reason === filter)),
    [threads, filter],
  );

  const grouped = useMemo(() => {
    const byRepo = new Map<string, NotificationThread[]>();
    for (const thread of filtered) {
      const key = thread.repository.full_name;
      const bucket = byRepo.get(key) ?? [];
      bucket.push(thread);
      byRepo.set(key, bucket);
    }
    return Array.from(byRepo.entries());
  }, [filtered]);

  return (
    <div className="flex h-full flex-col">
      <FeedHeader
        title="Notifications"
        subtitle="Unread GitHub notifications"
        busy={status === 'loading'}
        onRefresh={refresh}
      />
      <div className="mb-2 flex flex-wrap gap-1">
        {REASON_FILTERS.map((option) => {
          const active = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
                active
                  ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                  : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {status === 'error' && (
        <FeedState
          status="error"
          message={error ?? 'Failed to load notifications'}
          onRetry={refresh}
        />
      )}
      {status === 'loading' && threads.length === 0 && (
        <FeedState status="loading" message="Loading notifications…" />
      )}
      {status === 'ready' && filtered.length === 0 && (
        <FeedState
          status="empty"
          message={
            filter === 'all'
              ? 'Inbox zero. Nothing unread.'
              : 'No notifications match that filter.'
          }
        />
      )}
      {grouped.length > 0 && (
        <div className="flex flex-col gap-3">
          {grouped.map(([repoName, threadsInRepo]) => (
            <section
              key={repoName}
              className="overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle"
            >
              <header className="flex items-center gap-2 border-b border-gh-border-muted px-3 py-1.5">
                <img
                  src={threadsInRepo[0].repository.owner.avatar_url}
                  alt={threadsInRepo[0].repository.owner.login}
                  className="h-4 w-4 rounded-full border border-gh-border-default"
                />
                <span className="truncate text-[11px] font-semibold text-gh-fg-default">
                  {repoName}
                </span>
              </header>
              <ul className="divide-y divide-gh-border-muted">
                {threadsInRepo.map((thread) => (
                  <li key={thread.id}>
                    <NotificationRow thread={thread} onMarkRead={markRead} />
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

function NotificationRow({
  thread,
  onMarkRead,
}: {
  thread: NotificationThread;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const href = subjectUrlToHtmlUrl(thread.subject.url, thread.repository.html_url);

  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-gh-border-muted/40">
      <button
        type="button"
        onClick={() => openInNewTab(href)}
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
      >
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gh-border-default text-[11px] text-gh-fg-muted"
          title={thread.subject.type}
        >
          {subjectIcon(thread.subject.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gh-fg-default">
            {thread.subject.title}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
            <span className="shrink-0">{reasonLabel(thread.reason)}</span>
            <span>·</span>
            <span className="shrink-0">{relativeTime(thread.updated_at)}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          try {
            await onMarkRead(thread.id);
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="mt-0.5 shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis disabled:opacity-60"
        title="Mark as read"
      >
        {busy ? '…' : '✓'}
      </button>
    </div>
  );
}
