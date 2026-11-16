import type { NotificationItem } from '../../lib/github-api';
import type { PrioritizedNotification } from '../../shared/notifications/prioritizer';
import { compactRelativeTime } from '../../shared/utils/compactRelativeTime';
import { notifDisplayMeta } from '../../shared/utils/notifDisplay';
import { notificationHtmlUrl } from '../../lib/github-api';
import { GitPullRequestIcon, IssueOpenedIcon } from './GitHubIcons';
import { ROW_ATTRIBUTE } from '../lib/keyboard';

// Threads that ask something of you directly get the accent bar; watcher
// noise (subscribed, ci_activity, comment on something you follow) doesn't.
const NEEDS_YOU_REASONS: ReadonlySet<string> = new Set([
  'review_requested',
  'assign',
  'mention',
  'team_mention',
  'security_alert',
]);

function needsYou(item: { reason: string }): boolean {
  return NEEDS_YOU_REASONS.has(item.reason);
}

interface MarkReadBtnProps {
  marking: boolean;
  onMark: () => void;
}

function MarkReadBtn({ marking, onMark }: MarkReadBtnProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMark(); }}
      disabled={marking}
      title="Mark as read"
      className={`shrink-0 px-[7px] py-[3px] rounded border border-tg-line bg-transparent text-tg-fg3 text-[10px] self-center transition-[border-color,color] duration-[80ms] hover:border-tg-accent-border hover:text-tg-accent ${marking ? 'cursor-default opacity-50' : 'cursor-pointer opacity-100'} font-mono`}
    >
      {marking ? '…' : '✓'}
    </button>
  );
}

interface Props {
  item: PrioritizedNotification;
  marking: boolean;
  onMark: (item: NotificationItem) => void;
}

// Notifications don't say whether a PR or issue is still open, so the icon
// shows the subject type only. Other types fall back to a short type code.
const TYPE_ICONS: Record<string, typeof GitPullRequestIcon> = {
  PullRequest: GitPullRequestIcon,
  Issue: IssueOpenedIcon,
};

export function NotifRow({ item, marking, onMark }: Props) {
  const display = notifDisplayMeta(item);
  const ago = compactRelativeTime(item.updated_at);
  const url = notificationHtmlUrl(item);
  const prNum = item.subject.url?.match(/\/(\d+)$/)?.[1];
  const TypeIcon = TYPE_ICONS[item.subject.type] ?? null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      {...{ [ROW_ATTRIBUTE]: item.id }}
      className="flex py-2.5 pr-2.5 cursor-pointer bg-transparent relative no-underline outline-none transition-colors duration-[80ms] hover:bg-tg-bg2 focus-visible:bg-tg-bg2 focus-visible:shadow-[inset_0_0_0_1px_var(--tg-accent-border)]"
    >
      {/* Priority bar */}
      <div
        className={`w-0.5 self-stretch mr-2.5 mt-[3px] mb-[3px] rounded-sm shrink-0 ${needsYou(item) ? 'bg-tg-accent' : 'bg-transparent'}`}
      />

      {/* Unread dot */}
      <div className="w-2 flex items-start justify-center pt-[5px] shrink-0">
        {item.unread && (
          <div className="w-[5px] h-[5px] rounded-full bg-tg-accent" />
        )}
      </div>

      {/* Type Icon */}
      <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0 ml-[6px] mt-[1px]">
        {TypeIcon ? (
          <span className="flex items-center justify-center text-tg-open">
            <TypeIcon size={16} />
          </span>
        ) : (
          <span
            className="text-[9.5px] font-semibold tracking-[0.4px] px-[5px] py-[2px] rounded border border-tg-line bg-tg-tint leading-none inline-flex items-center h-[14px]"
            style={{ color: display.typeColor }}
          >
            {display.typeCode}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-[9px]">
        {/* Meta line: repo · #pr · ago */}
        <div className="flex items-center gap-[5px] text-[11px] text-tg-fg2 mb-[3px] leading-none font-mono">
          <span className="text-tg-fg1 overflow-hidden text-ellipsis whitespace-nowrap min-w-0 max-w-[140px]">
            {item.repository.full_name}
          </span>

          {prNum && (
            <span className="text-tg-fg3 shrink-0">#{prNum}</span>
          )}

          <span className="ml-auto text-tg-fg3 shrink-0">
            {ago}
          </span>
        </div>

        {/* Title */}
        <div
          className={`text-[12.5px] leading-[1.35] overflow-hidden tracking-[-0.1px] line-clamp-2 ${item.unread ? 'text-tg-fg0 font-medium' : 'text-tg-fg1 font-normal'}`}
        >
          {item.subject.title}
        </div>

        {/* Tertiary: why you got it */}
        <div className="mt-[3px] text-[11px] text-tg-fg3 leading-none whitespace-nowrap overflow-hidden text-ellipsis font-mono">
          {item.priority.reason}
        </div>
      </div>

      {/* Mark-read button (unread rows only) */}
      {item.unread && (
        <div className="ml-2 self-center">
          <MarkReadBtn marking={marking} onMark={() => onMark(item)} />
        </div>
      )}
    </a>
  );
}
