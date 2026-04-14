import { useNotifications } from '../../hooks/useNotifications';
import { relativeTime } from '../IssueRow';
import { TabShell } from './TabShell';
import type {
  NotificationItem,
  NotificationReason,
  NotificationSubjectType,
} from '../../../lib/github-api';

interface Props {
  token: string | null;
}

const REASON_OPTIONS: Array<{ id: NotificationReason | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'assign', label: 'Assigned' },
  { id: 'mention', label: 'Mention' },
  { id: 'review_requested', label: 'Review' },
  { id: 'team_mention', label: 'Team' },
];

const TYPE_ICON: Record<NotificationSubjectType, string> = {
  PullRequest: '⇄',
  Issue: '●',
  Discussion: '💬',
  Release: '⚑',
  Commit: '◆',
};

export function NotificationsTab({ token }: Props) {
  const n = useNotifications(token);

  return (
    <TabShell
      title="Notifications"
      status={n.status}
      error={n.error}
      isEmpty={n.items.length === 0}
      emptyMessage="Inbox zero."
      onRefresh={() => void n.refresh()}
    >
      <div className="flex gap-1 border-b border-gh-border-muted px-3 py-2">
        {REASON_OPTIONS.map((opt) => {
          const isActive = n.reasonFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => n.setReasonFilter(opt.id)}
              className={
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ' +
                (isActive
                  ? 'border-gh-accent-emphasis bg-gh-accent-emphasis text-white'
                  : 'border-gh-border-default text-gh-fg-muted hover:border-gh-fg-muted')
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <ul>
        {n.groups.map((group) => (
          <li key={group.repo} className="border-b border-gh-border-muted">
            <div className="bg-gh-canvas-subtle px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
              {group.repo}
            </div>
            <ul>
              {group.items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  onMarkRead={() => void n.markRead(item.id)}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </TabShell>
  );
}

function Row({ item, onMarkRead }: { item: NotificationItem; onMarkRead: () => void }) {
  const icon = TYPE_ICON[item.subject.type] ?? '•';
  const href = notificationHref(item);
  return (
    <li className="flex items-start gap-2 px-4 py-2 hover:bg-gh-canvas-subtle">
      <span
        aria-hidden="true"
        className="mt-[2px] shrink-0 text-sm text-gh-fg-muted"
        title={item.subject.type}
      >
        {icon}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1"
      >
        <div className="truncate text-sm font-semibold text-gh-fg-default">
          {item.subject.title}
        </div>
        <div className="truncate text-[11px] text-gh-fg-muted">
          {item.reason.replace('_', ' ')} · {relativeTime(item.updated_at)}
        </div>
      </a>
      <button
        type="button"
        onClick={onMarkRead}
        aria-label="Mark as read"
        title="Mark as read"
        className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis"
      >
        ✓
      </button>
    </li>
  );
}

function notificationHref(item: NotificationItem): string {
  // Notifications expose an api.github.com URL; convert it to the web URL
  // so click-through lands on the user-facing page.
  const url = item.subject.url;
  if (!url) return item.repository.html_url;
  return url
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/');
}
