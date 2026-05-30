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

function priorityBarColor(): string {
  return 'var(--tg-accent)';
}

function unreadDotColor(): string {
  return 'var(--tg-accent)';
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
      style={{
        flexShrink: 0,
        padding: '3px 7px',
        borderRadius: 4,
        border: '1px solid var(--tg-line)',
        background: 'transparent',
        color: 'var(--tg-fg3)',
        fontFamily: 'var(--tg-mono)',
        fontSize: 10,
        cursor: marking ? 'default' : 'pointer',
        opacity: marking ? 0.5 : 1,
        transition: 'border-color 80ms, color 80ms',
        alignSelf: 'center',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--tg-accent-border)';
        (e.currentTarget as HTMLElement).style.color = 'var(--tg-accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--tg-line)';
        (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg3)';
      }}
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
      style={{
        display: 'flex',
        padding: '10px 10px 10px 0',
        cursor: 'pointer',
        background: 'transparent',
        position: 'relative',
        opacity: dim ? 0.55 : 1,
        textDecoration: 'none',
        transition: 'background 80ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Priority bar */}
      <div
        style={{
          width: 2,
          alignSelf: 'stretch',
          marginRight: 10,
          marginTop: 3,
          marginBottom: 3,
          background: priorityBarColor(),
          borderRadius: 1,
          flexShrink: 0,
        }}
      />

      {/* Unread dot */}
      <div
        style={{
          width: 8,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 5,
          flexShrink: 0,
        }}
      >
        {item.unread && (
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              background: unreadDotColor(),
            }}
          />
        )}
      </div>

      {/* Type Icon */}
      <div
        style={{
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: 6,
          marginTop: 1,
        }}
      >
        {statusIcon ? (
          <span
            style={{
              color: statusIcon.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <statusIcon.icon size={16} />
          </span>
        ) : (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: display.typeColor,
              padding: '2px 5px',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--tg-line)',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              height: 14,
            }}
          >
            {display.typeCode}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, marginLeft: 9 }}>
        {/* Meta line: repo · #pr · ago */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--tg-fg2)',
            fontFamily: 'var(--tg-mono)',
            marginBottom: 3,
            lineHeight: 1,
          }}
        >
          {showRepo && (
            <span
              style={{
                color: 'var(--tg-fg1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                maxWidth: 140,
              }}
            >
              {item.repository.full_name}
            </span>
          )}

          {prNum && (
            <span style={{ color: 'var(--tg-fg3)', flexShrink: 0 }}>#{prNum}</span>
          )}

          {isClosed && (
            <span
              style={{
                fontSize: 9,
                padding: '2px 4px',
                borderRadius: 3,
                background: 'rgba(248, 81, 73, 0.15)',
                color: '#f85149',
                fontFamily: 'var(--tg-mono)',
                fontWeight: 600,
                letterSpacing: 0.3,
              }}
            >
              CLOSED
            </span>
          )}

          <span style={{ marginLeft: 'auto', color: 'var(--tg-fg3)', flexShrink: 0 }}>
            {ago}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 12.5,
            color: item.unread ? 'var(--tg-fg0)' : 'var(--tg-fg1)',
            fontWeight: item.unread ? 500 : 400,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            letterSpacing: -0.1,
          }}
        >
          {item.subject.title}
        </div>

        {/* Tertiary: enhanced reason with actor */}
        <div
          style={{
            marginTop: 3,
            fontSize: 11,
            color: 'var(--tg-fg3)',
            fontFamily: 'var(--tg-mono)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <span>{reasonText}</span>
          {actor && (
            <>
              <span style={{ color: 'var(--tg-line)' }}>·</span>
              <span style={{ color: 'var(--tg-fg2)', fontWeight: 500 }}>@{actor}</span>
            </>
          )}
          {context?.reviewState && (
            <span
              style={{
                marginLeft: 2,
                padding: '1px 4px',
                borderRadius: 3,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 0.3,
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

      {/* Mark-read button */}
      <div style={{ marginLeft: 8, alignSelf: 'center' }}>
        <MarkReadBtn marking={marking} onMark={() => onMark(item)} />
      </div>
    </a>
  );
}
