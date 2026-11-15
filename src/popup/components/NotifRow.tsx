import type { NotificationItem } from '../../lib/github-api';
import type { PrioritizedNotification } from '../../shared/notifications/grouper';
import type { NotificationContext } from '../../lib/notification-context';
import { compactRelativeTime } from '../../shared/utils/compactRelativeTime';
import { notifDisplayMeta } from '../../shared/utils/notifDisplay';
import { notificationHtmlUrl } from '../../lib/github-api';
import {
  GitPullRequestIcon,
  GitPullRequestClosedIcon,
  GitMergeIcon,
  IssueOpenedIcon,
  IssueClosedIcon,
} from './GitHubIcons';

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
      className={`shrink-0 px-[7px] py-[3px] rounded border border-[var(--tg-line)] bg-transparent text-[var(--tg-fg3)] text-[10px] self-center transition-[border-color,color] duration-[80ms] hover:border-[var(--tg-accent-border)] hover:text-[var(--tg-accent)] ${marking ? 'cursor-default opacity-50' : 'cursor-pointer opacity-100'}`}
      style={{ fontFamily: 'var(--tg-mono)' }}
    >
      {marking ? '…' : '✓'}
    </button>
  );
}

interface Props {
  item: PrioritizedNotification;
  marking: boolean;
  onMark: (item: NotificationItem) => void;
  showRepo?: boolean;
  isMerged?: boolean;
  isClosed?: boolean;
  isIssueClosed?: boolean;
  context?: NotificationContext;
}

function getStatusIcon(
  subjectType: string,
  isMerged: boolean,
  isClosed: boolean,
  isIssueClosed: boolean,
) {
  if (subjectType === 'PullRequest') {
    if (isMerged) {
      return { icon: GitMergeIcon, color: '#8250df' }; // Purple for merged
    }
    if (isClosed) {
      return { icon: GitPullRequestClosedIcon, color: '#d1242f' }; // Red for closed
    }
    return { icon: GitPullRequestIcon, color: '#1a7f37' }; // Green for open
  }

  if (subjectType === 'Issue') {
    if (isIssueClosed) {
      return { icon: IssueClosedIcon, color: '#8250df' }; // Purple for closed
    }
    return { icon: IssueOpenedIcon, color: '#1a7f37' }; // Green for open
  }

  return null;
}

export function NotifRow({
  item,
  marking,
  onMark,
  showRepo = true,
  isMerged = false,
  isClosed = false,
  isIssueClosed = false,
  context,
}: Props) {
  const display = notifDisplayMeta(item);
  const ago = compactRelativeTime(item.updated_at);
  const dim = false;
  const url = notificationHtmlUrl(item);
  const prNum = item.subject.url?.match(/\/(\d+)$/)?.[1];
  const statusIcon = getStatusIcon(item.subject.type, isMerged, isClosed, isIssueClosed);

  // Use enhanced context if available, otherwise fall back to priority reason
  const reasonText = context?.primaryReason ?? item.priority.reason;
  const actor = context?.actor;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex py-2.5 pr-2.5 cursor-pointer bg-transparent relative no-underline transition-colors duration-[80ms] hover:bg-[var(--tg-bg2)] ${dim ? 'opacity-55' : 'opacity-100'}`}
    >
      {/* Priority bar */}
      <div className="w-0.5 self-stretch mr-2.5 mt-[3px] mb-[3px] bg-[var(--tg-accent)] rounded-sm shrink-0" />

      {/* Unread dot */}
      <div className="w-2 flex items-start justify-center pt-[5px] shrink-0">
        {item.unread && (
          <div className="w-[5px] h-[5px] rounded-full bg-[var(--tg-accent)]" />
        )}
      </div>

      {/* Type Icon */}
      <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0 ml-[6px] mt-[1px]">
        {statusIcon ? (
          <span className="flex items-center justify-center" style={{ color: statusIcon.color }}>
            <statusIcon.icon size={16} />
          </span>
        ) : (
          <span
            className="text-[9.5px] font-semibold tracking-[0.4px] px-[5px] py-[2px] rounded border border-[var(--tg-line)] leading-none inline-flex items-center h-[14px]"
            style={{ color: display.typeColor, background: 'rgba(255,255,255,0.04)' }}
          >
            {display.typeCode}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-[9px]">
        {/* Meta line: repo · #pr · ago */}
        <div className="flex items-center gap-[5px] text-[11px] text-[var(--tg-fg2)] mb-[3px] leading-none" style={{ fontFamily: 'var(--tg-mono)' }}>
          {showRepo && (
            <span className="text-[var(--tg-fg1)] overflow-hidden text-ellipsis whitespace-nowrap min-w-0 max-w-[140px]">
              {item.repository.full_name}
            </span>
          )}

          {prNum && (
            <span className="text-[var(--tg-fg3)] shrink-0">#{prNum}</span>
          )}

          {isClosed && (
            <span
              className="text-[9px] px-1 py-[2px] rounded font-semibold tracking-[0.3px]"
              style={{ fontFamily: 'var(--tg-mono)', background: 'rgba(248, 81, 73, 0.15)', color: '#f85149' }}
            >
              CLOSED
            </span>
          )}

          <span className="ml-auto text-[var(--tg-fg3)] shrink-0">
            {ago}
          </span>
        </div>

        {/* Title */}
        <div
          className={`text-[12.5px] leading-[1.35] overflow-hidden tracking-[-0.1px] line-clamp-2 ${item.unread ? 'text-[var(--tg-fg0)] font-medium' : 'text-[var(--tg-fg1)] font-normal'}`}
        >
          {item.subject.title}
        </div>

        {/* Tertiary: enhanced reason with actor */}
        <div className="mt-[3px] text-[11px] text-[var(--tg-fg3)] leading-none whitespace-nowrap overflow-hidden text-ellipsis flex gap-1 items-center" style={{ fontFamily: 'var(--tg-mono)' }}>
          <span>{reasonText}</span>
          {actor && (
            <>
              <span className="text-[var(--tg-line)]">·</span>
              <span className="text-[var(--tg-fg2)] font-medium">@{actor}</span>
            </>
          )}
          {context?.reviewState && (
            <span
              className="ml-[2px] px-1 py-[1px] rounded text-[9px] font-semibold tracking-[0.3px]"
              style={{
                background:
                  context.reviewState === 'APPROVED'
                    ? 'rgba(26, 127, 55, 0.15)'
                    : context.reviewState === 'CHANGES_REQUESTED'
                    ? 'rgba(209, 36, 47, 0.15)'
                    : 'rgba(101, 109, 118, 0.15)',
                color:
                  context.reviewState === 'APPROVED'
                    ? '#1a7f37'
                    : context.reviewState === 'CHANGES_REQUESTED'
                    ? '#d1242f'
                    : '#656d76',
              }}
            >
              {context.reviewState === 'APPROVED'
                ? '✓'
                : context.reviewState === 'CHANGES_REQUESTED'
                ? '✗'
                : '💬'}
            </span>
          )}
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
